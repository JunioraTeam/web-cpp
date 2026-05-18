import {InternalError, SyntaxError} from "../../common/error";
import {Node, SourceLocation} from "../../common/node";
import {AddressType, FunctionEntity} from "../../common/symbol";
import {Type} from "../../type";
import {ClassType} from "../../type/class_type";
import {ArrayType, PointerType} from "../../type/compound_type";
import {WAddressHolder} from "../address";
import {CompileContext} from "../context";
import {AnonymousExpression} from "../expression/anonymous_expression";
import {AssignmentExpression} from "../expression/assignment_expression";
import {Expression, ExpressionResult, recycleExpressionResult} from "../expression/expression";
import {IntegerConstant} from "../expression/integer_constant";
import {SubscriptExpression} from "../expression/subscript_expression";
import {CallExpression} from "../function/call_expression";
import {doWeakTypeMatch, isFunctionExists} from "../overload";
import {FunctionLookUpResult} from "../scope";
import {ExpressionStatement} from "../statement/expression_statement";
import {Identifier} from "../expression/identifier";
import {MemberExpression} from "../class/member_expression";

export class InitializerList extends Node {
    public items: InitializerListItem[];

    constructor(location: SourceLocation, items: InitializerListItem[]) {
        super(location);
        this.items = items;
    }

    public initialize(ctx: CompileContext, node: Expression, type: Type) {
        if ( !(type instanceof ArrayType )) {
            throw new InternalError("InitializerList not support");
        }
        this.initializeArray(ctx, node, type);
    }

    public initializeArray(ctx: CompileContext, node: Expression, type: ArrayType) {
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            if ( item.initializer instanceof Expression ) {
                new ExpressionStatement(this.location,
                    new AssignmentExpression(this.location, "=",
                        new SubscriptExpression(this.location,
                            node,
                            IntegerConstant.fromNumber(this.location, i)),
                        item.initializer)).codegen(ctx);
            } else {
                if (!(type.elementType instanceof ArrayType) ) {
                    throw new SyntaxError(`illegal inner initializer list`, node);
                }
                item.initializer.initializeArray(ctx,
                    new SubscriptExpression(node.location,
                        node,
                        IntegerConstant.fromNumber(node.location, i)), type.elementType);
            }
        }
    }

    public toClassConstructorArguments(ctx: CompileContext, type: ClassType): Expression[] {
        const parameterTypes = this.getClassConstructorArgumentTypes(ctx, type);
        return this.items.map((item, i) => {
            if (item.initializer instanceof Expression) {
                const parameterType = parameterTypes[i];
                if (!doWeakTypeMatch(parameterType, item.initializer.deduceType(ctx))
                    && parameterType instanceof ClassType
                    && this.canConstructClassFromExpression(ctx, parameterType, item.initializer)) {
                    return new ClassConstructExpression(item.initializer.location, parameterType, [item.initializer]);
                }
                return item.initializer;
            }
            const parameterType = parameterTypes[i];
            if (!(parameterType instanceof ClassType || parameterType instanceof ArrayType)) {
                throw new SyntaxError(`illegal inner initializer list`, item);
            }
            return new InitializerListExpression(item.initializer.location, item.initializer, parameterType);
        });
    }

    public toPushBackArguments(ctx: CompileContext, type: ClassType): Expression[] {
        const lookupResult = type.getMember(ctx, "push_back", this);
        if (!(lookupResult instanceof FunctionLookUpResult)) {
            throw new SyntaxError(`no push_back member for ${type.shortName}`, this);
        }
        const candidate = lookupResult.functions
            .filter((item) => item instanceof FunctionEntity)[0] as FunctionEntity | undefined;
        if (!candidate || candidate.type.parameterTypes.length < 2) {
            throw new SyntaxError(`no matching push_back member for ${type.shortName}`, this);
        }
        const parameterType = candidate.type.parameterTypes[1];
        return this.items.map((item) => {
            if (item.initializer instanceof Expression) {
                if (!doWeakTypeMatch(parameterType, item.initializer.deduceType(ctx))
                    && parameterType instanceof ClassType
                    && this.canConstructClassFromExpression(ctx, parameterType, item.initializer)) {
                    return new ClassConstructExpression(item.initializer.location, parameterType, [item.initializer]);
                }
                return item.initializer;
            }
            if (!(parameterType instanceof ClassType || parameterType instanceof ArrayType)) {
                throw new SyntaxError(`illegal inner initializer list`, item);
            }
            return new InitializerListExpression(item.initializer.location, item.initializer, parameterType);
        });
    }

    public canInitializeWithPushBack(ctx: CompileContext, type: ClassType): boolean {
        const lookupResult = type.getMember(ctx, "push_back", this);
        return lookupResult instanceof FunctionLookUpResult;
    }

    private getClassConstructorArgumentTypes(ctx: CompileContext, type: ClassType): Type[] {
        const ctorName = type.fullName + "::#" + type.shortName;
        const lookupResult = ctx.scopeManager.lookup(ctorName);
        if (!(lookupResult instanceof FunctionLookUpResult)) {
            throw new SyntaxError(`no matching function for ${type.shortName}`, this);
        }
        const candidates = lookupResult.functions
            .filter((item) => item instanceof FunctionEntity) as FunctionEntity[];
        for (const candidate of candidates) {
            const parameterTypes = candidate.type.parameterTypes.slice(1);
            if (parameterTypes.length !== this.items.length) {
                continue;
            }
            let matched = true;
            for (let i = 0; i < this.items.length; i++) {
                const initializer = this.items[i].initializer;
                const parameterType = parameterTypes[i];
                if (initializer instanceof Expression) {
                    matched = doWeakTypeMatch(parameterType, initializer.deduceType(ctx))
                        || (parameterType instanceof ClassType
                            && this.canConstructClassFromExpression(ctx, parameterType, initializer));
                } else {
                    matched = parameterType instanceof ClassType || parameterType instanceof ArrayType;
                }
                if (!matched) {
                    break;
                }
            }
            if (matched) {
                return parameterTypes;
            }
        }
        throw new SyntaxError(`no matching function for ${type.shortName}`, this);
    }

    private canConstructClassFromExpression(ctx: CompileContext, type: ClassType, expression: Expression): boolean {
        const ctorName = type.fullName + "::#" + type.shortName;
        return isFunctionExists(ctx, ctorName, [new PointerType(type), expression.deduceType(ctx)]);
    }
}

export class InitializerListItem extends Node {
    public initializer: Expression | InitializerList;

    constructor(location: SourceLocation, initializer: Expression | InitializerList) {
        super(location);
        this.initializer = initializer;
    }
}

export class InitializerListExpression extends Expression {
    public initializer: InitializerList;
    public type: ClassType | ArrayType;

    constructor(location: SourceLocation, initializer: InitializerList, type: ClassType | ArrayType) {
        super(location);
        this.initializer = initializer;
        this.type = type;
    }

    public codegen(ctx: CompileContext): ExpressionResult {
        const holder = new WAddressHolder(ctx.memory.allocStack(this.type.length), AddressType.STACK, this.location);
        const result = {
            type: this.type,
            expr: holder,
            isLeft: true,
        };
        const target = new AnonymousExpression(this.location, result);
        if (this.type instanceof ClassType) {
            const ctorName = this.type.fullName + "::#" + this.type.shortName;
            const thisPtr = new AnonymousExpression(this.location, {
                type: new PointerType(this.type),
                expr: holder.createLoadAddress(ctx),
                isLeft: false,
            });
            if (this.initializer.canInitializeWithPushBack(ctx, this.type)) {
                recycleExpressionResult(ctx, this, new CallExpression(this.location,
                    Identifier.fromString(this.location, ctorName), [thisPtr]).codegen(ctx));
                for (const arg of this.initializer.toPushBackArguments(ctx, this.type)) {
                    recycleExpressionResult(ctx, this, new CallExpression(this.location,
                        new MemberExpression(this.location, target, false,
                            Identifier.fromString(this.location, "push_back")),
                        [arg]).codegen(ctx));
                }
            } else {
                const expr = new CallExpression(this.location, Identifier.fromString(this.location, ctorName), [
                    thisPtr,
                    ...this.initializer.toClassConstructorArguments(ctx, this.type),
                ]);
                recycleExpressionResult(ctx, this, expr.codegen(ctx));
            }
        } else {
            this.initializer.initializeArray(ctx, target, this.type);
        }
        return result;
    }

    public deduceType(ctx: CompileContext): Type {
        return this.type;
    }
}

export class ClassConstructExpression extends Expression {
    public type: ClassType;
    public args: Expression[];

    constructor(location: SourceLocation, type: ClassType, args: Expression[]) {
        super(location);
        this.type = type;
        this.args = args;
    }

    public codegen(ctx: CompileContext): ExpressionResult {
        const holder = new WAddressHolder(ctx.memory.allocStack(this.type.length), AddressType.STACK, this.location);
        const thisPtr = new AnonymousExpression(this.location, {
            type: new PointerType(this.type),
            expr: holder.createLoadAddress(ctx),
            isLeft: false,
        });
        const ctorName = this.type.fullName + "::#" + this.type.shortName;
        recycleExpressionResult(ctx, this, new CallExpression(this.location,
            Identifier.fromString(this.location, ctorName), [thisPtr, ...this.args]).codegen(ctx));
        return {
            type: this.type,
            expr: holder,
            isLeft: true,
        };
    }

    public deduceType(ctx: CompileContext): Type {
        return this.type;
    }
}
