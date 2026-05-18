import * as Long from "long";
import {InternalError, SyntaxError, TypeError} from "../../common/error";
import {SourceLocation} from "../../common/node";
import {AddressType, FunctionEntity} from "../../common/symbol";
import {Type} from "../../type";
import {ClassType} from "../../type/class_type";
import {ArrayType, LeftReferenceType, PointerType} from "../../type/compound_type";
import {CppFunctionType, FunctionType, UnresolvedFunctionOverloadType} from "../../type/function_type";
import {PrimitiveTypes} from "../../type/primitive_type";
import {
    I32Binary,
    WBinaryOperation, WCall,
    WCallIndirect,
    WConst,
    WExpression, WFakeExpression,
    WGetGlobal, WLoad, WMemoryLocation,
    WSetGlobal,
    WStatement,
    WType,
} from "../../wasm";
import {WAddressHolder} from "../address";
import {MemberExpression} from "../class/member_expression";
import {CompileContext} from "../context";
import {doConversion, doTypePromote, doValuePromote, getInStackSize} from "../conversion";
import {AnonymousExpression} from "../expression/anonymous_expression";
import {Expression, ExpressionResult} from "../expression/expression";
import {Identifier} from "../expression/identifier";
import {IntegerConstant} from "../expression/integer_constant";
import {UnaryExpression} from "../expression/unary_expression";
import {doFunctionOverloadResolution, doWeakTypeMatch, isFunctionExists} from "../overload";
import {ClassConstructExpression, InitializerList, InitializerListExpression} from "../declaration/initializer_list";

type CallArgument = Expression | InitializerList;

export class CallExpression extends Expression {
    public callee: Expression;
    public arguments: CallArgument[];

    constructor(location: SourceLocation, callee: Expression, myArguments: CallArgument[]) {
        super(location);
        this.callee = callee;
        this.arguments = myArguments;
    }

    private getArgumentTypes(ctx: CompileContext): Type[] {
        return this.arguments.map((arg) => {
            if (arg instanceof InitializerList) {
                throw new SyntaxError(`initializer list argument needs a target parameter type`, arg);
            }
            return arg.deduceType(ctx);
        });
    }

    private canUseInitializerListArgument(ctx: CompileContext, initializer: InitializerList, parameterType: Type): boolean {
        if (parameterType instanceof ClassType) {
            try {
                initializer.toClassConstructorArguments(ctx, parameterType);
                return true;
            } catch (e) {
                return false;
            }
        }
        return parameterType instanceof ArrayType;
    }

    private matchCallArgument(ctx: CompileContext, parameterType: Type, arg: CallArgument): boolean {
        if (arg instanceof InitializerList) {
            return this.canUseInitializerListArgument(ctx, arg, parameterType);
        }
        if (!doWeakTypeMatch(parameterType, arg.deduceType(ctx))
            && parameterType instanceof ClassType
            && this.canConstructClassFromExpression(ctx, parameterType, arg)) {
            return true;
        }
        return doWeakTypeMatch(parameterType, arg.deduceType(ctx));
    }

    private canConstructClassFromExpression(ctx: CompileContext, type: ClassType, expression: Expression): boolean {
        const ctorName = type.fullName + "::#" + type.shortName;
        return isFunctionExists(ctx, ctorName, [new PointerType(type), expression.deduceType(ctx)]);
    }

    private resolveFlexibleOverload(ctx: CompileContext,
                                    lookUpResult: UnresolvedFunctionOverloadType): FunctionEntity | null {
        const funcs = lookUpResult.functionLookupResult.functions
            .filter((x) => x instanceof FunctionEntity) as FunctionEntity[];
        for (const func of funcs) {
            const parameterTypes = func.type.isMemberFunction()
                ? func.type.parameterTypes.slice(1)
                : func.type.parameterTypes;
            if (parameterTypes.length !== this.arguments.length) {
                continue;
            }
            let matched = true;
            for (let i = 0; i < parameterTypes.length; i++) {
                if (!this.matchCallArgument(ctx, parameterTypes[i], this.arguments[i])) {
                    matched = false;
                    break;
                }
            }
            if (matched) {
                return func;
            }
        }
        return null;
    }

    private getPreparedArguments(ctx: CompileContext, funcType: FunctionType): Expression[] {
        return this.arguments.map((arg, index) => {
            const parameterType = funcType.parameterTypes[index];
            if (parameterType === undefined) {
                return arg instanceof InitializerList
                    ? new InitializerListExpression(arg.location, arg, new ArrayType(PrimitiveTypes.int32, arg.items.length))
                    : arg;
            }
            if (!(arg instanceof InitializerList)) {
                if (!doWeakTypeMatch(parameterType, arg.deduceType(ctx))
                    && parameterType instanceof ClassType
                    && this.canConstructClassFromExpression(ctx, parameterType, arg)) {
                    return new ClassConstructExpression(arg.location, parameterType, [arg]);
                }
                return arg;
            }
            if (!(parameterType instanceof ClassType || parameterType instanceof ArrayType)) {
                throw new SyntaxError(`initializer list argument requires class or array parameter type`, arg);
            }
            return new InitializerListExpression(arg.location, arg, parameterType);
        });
    }

    private createInitializerListMinMaxExpression(ctx: CompileContext): Expression | null {
        if (!(this.callee instanceof Identifier) || this.arguments.length !== 1
            || !(this.arguments[0] instanceof InitializerList)) {
            return null;
        }
        const name = this.callee.getPlainName(ctx);
        if (name !== "min" && name !== "max") {
            return null;
        }
        const initializer = this.arguments[0] as InitializerList;
        const items = initializer.items;
        if (items.length === 0) {
            throw new SyntaxError(`${name} requires a non-empty initializer list`, initializer);
        }
        let result: Expression | null = null;
        for (const item of items) {
            if (!(item.initializer instanceof Expression)) {
                throw new SyntaxError(`${name} initializer list cannot contain nested initializer lists`, item);
            }
            result = result === null
                ? item.initializer
                : new CallExpression(this.location, this.callee.clone(), [result, item.initializer]);
        }
        return result;
    }

    public getTargetFunction(ctx: CompileContext): FunctionType | FunctionEntity {
        let calleeType = this.callee.deduceType(ctx);

        if (calleeType instanceof ClassType) {
            this.callee = new MemberExpression(this.location, this.callee, false,
                Identifier.fromString(this.location, "#()"));
            calleeType = this.callee.deduceType(ctx);
        }

        if (calleeType instanceof PointerType && calleeType.elementType instanceof FunctionType) {
            return calleeType.elementType;
        }

        if (!(calleeType instanceof UnresolvedFunctionOverloadType)) {
            throw new TypeError(`the callee is not function`, this);
        }
        const lookUpResult = calleeType.functionLookupResult;

        const funcs = lookUpResult.functions.filter((x) => x instanceof FunctionEntity) as FunctionEntity[];
        let entity: FunctionEntity | null = funcs.length === 0 ? null : funcs[0]!;

        if ( ctx.isCpp() ) {
            if (this.arguments.some((arg) => arg instanceof InitializerList)) {
                entity = this.resolveFlexibleOverload(ctx, calleeType);
            } else {
                try {
                    entity = doFunctionOverloadResolution(ctx, lookUpResult,
                        this.getArgumentTypes(ctx), this);
                } catch (e) {
                    entity = this.resolveFlexibleOverload(ctx, calleeType);
                    if (entity === null) {
                        throw e;
                    }
                }
            }
        }

        if (entity === null ) {
            throw new SyntaxError(`no matching function for ${lookUpResult.functions[0].shortName}`, this);
        }

        return entity;
    }

    public generateFunctionBody(ctx: CompileContext, targetFunction: FunctionType | FunctionEntity,
                                thisPtrs: ExpressionResult[]): [WExpression[], WStatement[]] {
        const funcType = targetFunction instanceof FunctionEntity ? targetFunction.type : targetFunction;
        const callArguments = this.getPreparedArguments(ctx, new FunctionType(
            funcType.returnType,
            funcType.parameterTypes.slice(thisPtrs.length),
            funcType.variableArguments,
        ));
        let stackSize = 0;
        const arguExprTypes = [...thisPtrs.map((x) => x.type), ... callArguments.map((x) => x.deduceType(ctx))];
        if (funcType.variableArguments) {
            for (let i = arguExprTypes.length - 1; i > funcType.parameterTypes.length - 1; i--) {
                const src = arguExprTypes[i];
                if (src instanceof ClassType) {
                    throw new SyntaxError(`class type could not be variable arguments`, this);
                }
                const newSrc = doTypePromote(ctx, src, this);
                stackSize += getInStackSize(newSrc.length);
            }
        }
        for (let i = funcType.parameterTypes.length - 1; i >= 0; i--) {
            let dstType = funcType.parameterTypes[i];
            if (dstType instanceof ArrayType) {
                dstType = new PointerType(dstType.elementType);
            }
            if (dstType instanceof ClassType) {
                stackSize += getInStackSize(dstType.length);
            } else {
                if (funcType.variableArguments) {
                    stackSize += getInStackSize(dstType.length);
                }
            }
        }
        // compute finish

        ctx.memory.currentState.stackPtr -= stackSize;
        const arguExprs = [...thisPtrs, ... callArguments.map((x) => x.codegen(ctx))];
        ctx.memory.currentState.stackPtr += stackSize;

        if (targetFunction instanceof FunctionEntity && funcType.parameterTypes.length > arguExprs.length) {
            // could be default parameters
            for (let i = arguExprs.length; i < funcType.parameterTypes.length; i++) {
                const init = targetFunction.parameterInits[i];
                if (init !== null) {
                    arguExprs.push({
                        type: funcType.parameterTypes[i],
                        expr: new WConst(funcType.parameterTypes[i].toWType(),
                            init, this.location),
                        isLeft: false,
                    });
                } else {
                    throw new SyntaxError(`function call parameters number mismatch`, this);
                }
            }
        }

        const argus: WExpression[] = [];
        let stackOffset = ctx.memory.currentState.stackPtr;
        const finalStackOffset = ctx.memory.currentState.stackPtr - stackSize;
        let parameterOffset = 0;

        if (funcType.variableArguments) {
            for (let i = arguExprs.length - 1; i > funcType.parameterTypes.length - 1; i--) {
                const src = arguExprs[i];
                if (src.type instanceof ClassType) {
                    throw new SyntaxError(`class type could not be variable arguments`, this);
                }
                const newSrc = doValuePromote(ctx, src, this);
                stackOffset -= getInStackSize(newSrc.type.length);
                argus.push(new WFakeExpression(
                    new WAddressHolder(stackOffset, AddressType.GLOBAL_SP, this.location)
                        .createStore(ctx, newSrc.type, newSrc.expr, true)
                    , this.location));
            }
            // argus.push(new WConst(WType.u32, this.arguments.length.toString()));
        } else {
            if (funcType.parameterTypes.length < this.arguments.length) {
                throw new SyntaxError(`function call parameters number mismatch`, this);
            }
        }

        for (let i = funcType.parameterTypes.length - 1; i >= 0; i--) {
            let dstType = funcType.parameterTypes[i];
            if (dstType instanceof ArrayType) {
                dstType = new PointerType(dstType.elementType);
            }
            const src = arguExprs[i];
            if (dstType instanceof ClassType) {
                const rightType = src.type;
                const leftPtrType = new PointerType(dstType);
                const parameterSize = getInStackSize(dstType.length);
                stackOffset -= parameterSize;
                const left = new AnonymousExpression(this.location, {
                    type: leftPtrType,
                    isLeft: false,
                    expr: new WAddressHolder(finalStackOffset + parameterOffset, AddressType.GLOBAL_SP, this.location)
                        .createLoadAddress(ctx),
                });
                parameterOffset += parameterSize;
                const right = new AnonymousExpression(this.location, src);
                const fullName = dstType.fullName + "::#" + dstType.shortName;
                let expr: ExpressionResult;
                if (isFunctionExists(ctx, fullName, [leftPtrType, rightType], null)) {
                    expr = new CallExpression(this.location,
                        Identifier.fromString(this.location, fullName),
                        [left, right]).codegen(ctx);
                } else {
                    const len = dstType.length;
                    expr = new CallExpression(this.location, Identifier.fromString(this.location, "::memcpy"), [
                        left,
                        new UnaryExpression(this.location, "&", right),
                        new IntegerConstant(this.location, 10, Long.fromInt(len), len.toString(), null),
                    ]).codegen(ctx);
                }
                argus.push(expr.expr);
            } else {
                const srcExpr = doConversion(ctx, dstType, src, this, false, true).fold();
                if (funcType.variableArguments) {
                    stackOffset -= getInStackSize(dstType.length);
                    argus.push(new WFakeExpression(
                        new WAddressHolder(stackOffset, AddressType.GLOBAL_SP, this.location)
                            .createStore(ctx, src.type, srcExpr, true)
                        , this.location));
                } else {
                    argus.push(srcExpr);
                }
            }
        }
        argus.reverse();    // wasm call standard => push $0 first

        const afterStatements: WStatement[] = [];

        if (stackOffset !== 0) {
            argus.push(new WFakeExpression(new WSetGlobal(WType.u32, "$sp",
                new WBinaryOperation(I32Binary.add,
                    new WGetGlobal(WType.u32, "$sp", this.location),
                    new WConst(WType.i32, stackOffset.toString(), this.location),
                    this.location), this.location), this.location));
            afterStatements.push(new WFakeExpression(new WSetGlobal(WType.u32, "$sp",
                new WBinaryOperation(I32Binary.sub,
                    new WGetGlobal(WType.u32, "$sp", this.location),
                    new WConst(WType.i32, stackOffset.toString(), this.location),
                    this.location), this.location), this.location));

        }

        return [argus, afterStatements];
    }

    public codegen(ctx: CompileContext): ExpressionResult {
        const initializerListMinMax = this.createInitializerListMinMaxExpression(ctx);
        if (initializerListMinMax !== null) {
            return initializerListMinMax.codegen(ctx);
        }
        const targetFunction = this.getTargetFunction(ctx);
        const funcType = targetFunction instanceof FunctionEntity ? targetFunction.type : targetFunction;
        const callee = this.callee.codegen(ctx);
        const thisPtrs: ExpressionResult[] = [];
        let VCallExpr: WExpression | null = null;
        if (targetFunction instanceof FunctionEntity && targetFunction.type.isMemberFunction()) {
            if (!(callee.type instanceof UnresolvedFunctionOverloadType)) {
                throw new InternalError(`callee.type instanceof UnresolvedFunctionOverloadType`);
            }
            const lookUpResult = callee.type.functionLookupResult;
            if (lookUpResult.instance === null || lookUpResult.instanceType === null) {
                throw new SyntaxError(`call a member function must bind a object`, this);
            }
            thisPtrs.push({
                expr: lookUpResult.instance.createLoadAddress(ctx),
                type: new PointerType(lookUpResult.instanceType),
                isLeft: false,
            });
            if (targetFunction.type.isVirtual && lookUpResult.isDynamicCall) {
                const vcallSigature =
                    targetFunction.type.cppFunctionType === CppFunctionType.Destructor ? "~" :
                        targetFunction.shortName.split("@")[0] + "@" + targetFunction.type.parameterTypes
                            .slice(1).map((x) => x.toString()).join(",");

                const ret = lookUpResult.instanceType.getVCallInfo(vcallSigature);
                if ( ret === null) {
                    throw new SyntaxError(`${targetFunction.shortName} is not a virtual function`, this);
                }
                const [vPtrOffset, vFuncOffset] = ret;
                const vTableExpr = new WLoad(WType.i32, new WBinaryOperation(
                    I32Binary.add,
                    lookUpResult.instance.createLoadAddress(ctx),
                    new WConst(WType.i32, vPtrOffset.toString(), this.location),
                    this.location), WMemoryLocation.RAW, this.location);
                VCallExpr = new WLoad(WType.i32, new WBinaryOperation(
                    I32Binary.add,
                    vTableExpr,
                    new WConst(WType.i32, vFuncOffset.toString(), this.location),
                    this.location), WMemoryLocation.RAW, this.location);
            }
        }

        const [argus, afterStatements] = this.generateFunctionBody(ctx, targetFunction, thisPtrs);

        let funcExpr: WExpression;

        if (VCallExpr !== null) {
            ctx.requiredWASMFuncTypes.add(funcType.toWASMEncoding()); // require by wasm
            funcExpr = new WCallIndirect(VCallExpr as WExpression,
                funcType.toWASMEncoding(), argus, afterStatements, this.location);
        } else {
            if (targetFunction instanceof FunctionEntity) {
                funcExpr = new WCall(targetFunction.fullName, argus, afterStatements, this.location);
            } else {
                callee.type = PrimitiveTypes.int32;
                ctx.requiredWASMFuncTypes.add(funcType.toWASMEncoding()); // require by wasm
                funcExpr = new WCallIndirect(doConversion(ctx, PrimitiveTypes.int32, callee, this),
                    funcType.toWASMEncoding(), argus, afterStatements, this.location);
            }
        }

        if (funcType.returnType instanceof LeftReferenceType
            && !(funcType.returnType.elementType instanceof ClassType)) {
            return {
                type: funcType.returnType.elementType,
                expr: new WAddressHolder(
                    funcExpr,
                    AddressType.RVALUE,
                    this.location),
                isLeft: true,
            };
        } else if (funcType.returnType instanceof ClassType) {
            return {
                type: funcType.returnType,
                expr: new WAddressHolder(
                    funcExpr,
                    AddressType.RVALUE,
                    this.location),
                isLeft: true,
            };
        } else {
            return {
                type: funcType.returnType,
                expr: funcExpr,
                isLeft: false,
            };
        }
    }

    public deduceType(ctx: CompileContext): Type {
        const initializerListMinMax = this.createInitializerListMinMaxExpression(ctx);
        if (initializerListMinMax !== null) {
            return initializerListMinMax.deduceType(ctx);
        }
        const targetFunction = this.getTargetFunction(ctx);
        if (targetFunction instanceof FunctionEntity) {
            return targetFunction.type.returnType;
        } else {
            return targetFunction.returnType;
        }
    }
}
