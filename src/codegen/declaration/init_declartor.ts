import {InternalError, SyntaxError} from "../../common/error";
import {Node, SourceLocation} from "../../common/node";
import {AddressType, Variable} from "../../common/symbol";
import {AccessControl, Type} from "../../type";
import {ClassType} from "../../type/class_type";
import {ArrayType, PointerType, ReferenceType} from "../../type/compound_type";
import {CppFunctionType, FunctionType} from "../../type/function_type";
import {CharType} from "../../type/primitive_type";
import {CompileContext} from "../context";
import {AssignmentExpression} from "../expression/assignment_expression";
import {Expression, recycleExpressionResult} from "../expression/expression";
import {Identifier} from "../expression/identifier";
import {IntegerConstant} from "../expression/integer_constant";
import {SubscriptExpression} from "../expression/subscript_expression";
import {UnaryExpression} from "../expression/unary_expression";
import {MemberExpression} from "../class/member_expression";
import {CallExpression} from "../function/call_expression";
import {ExpressionStatement} from "../statement/expression_statement";
import {getForLoop} from "../statement/for_statement";
import {declareFunction} from "../function/function";
import {StringLiteral} from "../expression/string_literal";
import {Declarator} from "./declarator";
import {FunctionDeclarator} from "./function_declarator";
import {InitializerList} from "./initializer_list";
import {ObjectInitializer} from "./object_initializer";
import {Pointer, PointerDeclarator} from "./pointer_declarator";

export interface SpecifierInfo {
    type: Type;
    isLibCall: boolean;
    isExtern: boolean;
    isStatic: boolean;
    isVirtual?: boolean;
    accessControl: AccessControl;
}

export class InitDeclarator extends Node {
    public declarator: Declarator;
    public initializer: Expression | ObjectInitializer | InitializerList | null;

    constructor(location: SourceLocation, declarator: Declarator,
                initializer: Expression | ObjectInitializer | InitializerList | null) {
        super(location);
        this.declarator = declarator;
        this.initializer = initializer;
    }

    private getDeclaredType(ctx: CompileContext, info: SpecifierInfo): Type {
        const type = this.declarator.getType(ctx, info.type);
        if (type instanceof ArrayType && type.size === 0 && this.initializer instanceof InitializerList) {
            return new ArrayType(type.elementType, this.initializer.items.length);
        }
        if (type instanceof ArrayType && type.size === 0 && type.elementType instanceof CharType
            && this.initializer instanceof StringLiteral) {
            return new ArrayType(type.elementType, this.initializer.value.length);
        }
        return type;
    }

    private initializeCharArrayFromString(ctx: CompileContext, name: Expression, type: ArrayType, literal: StringLiteral) {
        if (literal.value.length > type.size) {
            throw new SyntaxError(`initializer string for char array is too long`, this);
        }
        for (let i = 0; i < type.size; i++) {
            const value = i < literal.value.length ? literal.value.charCodeAt(i) : 0;
            recycleExpressionResult(ctx, this, new AssignmentExpression(this.location, "=",
                new SubscriptExpression(this.location, name, IntegerConstant.fromNumber(this.location, i)),
                IntegerConstant.fromNumber(this.location, value)).codegen(ctx));
        }
    }

    public initialize(ctx: CompileContext, info: SpecifierInfo) {
        const type = this.getDeclaredType(ctx, info);
        const name = this.declarator.getNameRequired();
        const shortName = name.getShortName(ctx);
        if (this.initializer != null) {
            if (info.isExtern) {
                throw new SyntaxError(`extern vaiable could not have initializer`, this);
            }
            if (this.initializer instanceof InitializerList) {
                if (type instanceof ClassType) {
                    if (this.initializer.canInitializeWithPushBack(ctx, type)) {
                        new ObjectInitializer(this.initializer.location, []).initialize(ctx, name, type);
                        for (const arg of this.initializer.toPushBackArguments(ctx, type)) {
                            recycleExpressionResult(ctx, this, new CallExpression(this.initializer.location,
                                new MemberExpression(this.initializer.location, name, false,
                                    Identifier.fromString(this.location, "push_back")),
                                [arg]).codegen(ctx));
                        }
                    } else {
                        const args = this.initializer.toClassConstructorArguments(ctx, type);
                        new ObjectInitializer(this.initializer.location, args).initialize(ctx, name, type);
                    }
                } else {
                    this.initializer.initialize(ctx, name, type);
                }
            } else if (this.initializer instanceof ObjectInitializer) {
                this.initializer.initialize(ctx, name, type);
            } else if (type instanceof ArrayType && type.elementType instanceof CharType
                && this.initializer instanceof StringLiteral) {
                this.initializeCharArrayFromString(ctx, name, type, this.initializer);
            } else if (type instanceof ClassType) {
                new ObjectInitializer(this.initializer.location, [this.initializer]).initialize(ctx, name, type);
            } else {
                const expr = new AssignmentExpression(this.location, "=",
                    Identifier.fromString(this.location, shortName),
                    this.initializer);
                expr.isInitExpr = true;
                recycleExpressionResult(ctx, this, expr.codegen(ctx));
            }
        } else if (type instanceof ClassType) {
            const ctorName = type.fullName + "::#" + type.shortName;
            const callee = Identifier.fromString(this.location, ctorName);
            const thisPtr = new UnaryExpression(this.location, "&",
                Identifier.fromString(this.location, shortName));
            const expr = new CallExpression(this.location, callee, [thisPtr]);
            recycleExpressionResult(ctx, this, expr.codegen(ctx));
        } else if (type instanceof ArrayType && type.elementType instanceof ClassType) {
            const ctorName = type.elementType.fullName + "::#" + type.elementType.shortName;
            const callee = Identifier.fromString(this.location, ctorName);
            getForLoop(IntegerConstant.fromNumber(this.location, type.size), (i) => ([
                new ExpressionStatement(this.location,
                    new CallExpression(this.location, callee, [
                        new UnaryExpression(this.location, "&",
                            new SubscriptExpression(this.location,
                                Identifier.fromString(this.location, shortName), i)),
                    ])),
            ]), this).codegen(ctx);
        }
    }

    public deduceAutoType(ctx: CompileContext): Type {
        if (this.initializer === null) {
            throw new SyntaxError(`auto variable requires an initializer`, this);
        }
        if (!(this.initializer instanceof Expression)) {
            throw new SyntaxError(`cannot deduce auto type from this initializer`, this);
        }
        const initializerType = this.initializer.deduceType(ctx);
        if (this.declarator instanceof PointerDeclarator) {
            let pointer: Pointer | null = this.declarator.pointer;
            let declaratorType = initializerType;
            while (pointer !== null) {
                if (pointer.type === "*" && declaratorType instanceof PointerType) {
                    declaratorType = declaratorType.elementType;
                } else if (pointer.type === "&" && declaratorType instanceof ReferenceType) {
                    declaratorType = declaratorType.elementType;
                }
                pointer = pointer.pointer;
            }
            return declaratorType;
        }
        return initializerType;
    }

    public createVariable(ctx: CompileContext, info: SpecifierInfo): Variable {
        const name = this.declarator.getNameRequired();
        const shortName = name.getShortName(ctx);
        const fullName = name.getFullName(ctx);
        const type = this.getDeclaredType(ctx, info);
        let storageType = AddressType.STACK;
        let location: number | string = 0;

        if (ctx.currentFuncContext.currentFunction === null || info.isStatic) {
            if (info.isExtern) {
                storageType = AddressType.MEMORY_EXTERN;
                location = fullName;
            } else if (this.initializer !== null && !(type instanceof ArrayType)) {
                storageType = AddressType.MEMORY_DATA;
                location = ctx.memory.allocData(type.length);
            } else {
                storageType = AddressType.MEMORY_BSS;
                location = ctx.memory.allocBss(type.length);
            }
        } else {
            if (info.isExtern) {
                throw new SyntaxError("local variable could not be extern:  " + name, this);
            }
            // TODO:: support static function variable;
            storageType = AddressType.STACK;
            location = ctx.memory.allocStack(type.length);
        }
        return new Variable(
            shortName, fullName, ctx.fileName,
            type, storageType, location, info.accessControl);
    }

    public declareGlobal(ctx: CompileContext, info: SpecifierInfo, lookupName: string) {
        const type = this.getDeclaredType(ctx, info);

        if (type instanceof ClassType && !type.isComplete) {
            throw new SyntaxError(`cannot instance incomplete type`, this);
        }

        if (type instanceof FunctionType) {
            const functionDeclarator = FunctionDeclarator.getFunctionDeclarator(this.declarator);
            if (!functionDeclarator) {
                throw new InternalError(`function is not a functionDeclarator`);
            }
            declareFunction(ctx, {
                name: lookupName,
                functionType: type,
                parameterNames: [], // functionDeclarator.parameters.getNameList(ctx),
                parameterInits: [], // functionDeclarator.parameters.getInitList(ctx),
                accessControl: info.accessControl,
                isLibCall: info.isLibCall,
            }, this);
        } else {
            if (ctx.scopeManager.currentContext.scope.classType
                && !info.isStatic) {
                // if in class, we should skip
                return;
            }
            const newItem = this.createVariable(ctx, info);
            if (info.isExtern) {
                ctx.scopeManager.declare(lookupName, newItem, this);
            } else {
                ctx.scopeManager.define(lookupName, newItem, this);
            }
        }
    }

    public declare(ctx: CompileContext, info: SpecifierInfo) {
        const name = this.declarator.getNameRequired();
        const lookupName = name.getLookupName(ctx);
        this.declareGlobal(ctx, info, lookupName);
        if (!ctx.scopeManager.currentContext.scope.classType) {
            this.initialize(ctx, info);
        }
    }

    public declareInClass(ctx: CompileContext, info: SpecifierInfo, classType: ClassType) {
        const type = this.getDeclaredType(ctx, info);
        const name = this.declarator.getNameRequired();
        const lookupName = name.getLookupName(ctx);
        if (info.isStatic ) {
            info.isExtern = true; // we only declare hereby
            this.declareGlobal(ctx, info, lookupName);
            if (this.initializer) {
                throw new SyntaxError(`the static field could only be initialize outside the class`, this);
            }
        } else {
            if (type instanceof FunctionType) {
                const functionDeclarator = FunctionDeclarator.getFunctionDeclarator(this.declarator);
                if (!functionDeclarator) {
                    throw new InternalError(`function is not a functionDeclarator`);
                }
                type.parameterTypes = [new PointerType(classType), ...type.parameterTypes];
                type.cppFunctionType = CppFunctionType.MemberFunction;
                type.referenceClass = classType;
                const isVirtual = !!info.isVirtual;
                const fullName = name.getFullName(ctx) + "@" + type.toMangledName();
                const vcallSigature = name.getShortName(ctx) + "@" + type.parameterTypes
                    .slice(1).map((x) => x.toString()).join(",");
                if (isVirtual) {
                    type.isVirtual = true;
                    classType.registerVFunction(ctx, vcallSigature, fullName);
                }
                declareFunction(ctx, {
                    name: lookupName,
                    functionType: type,
                    parameterNames: ["this", ...functionDeclarator.parameters.getNameList(ctx)],
                    parameterInits: [null, ...functionDeclarator.parameters.getInitList(ctx)],
                    accessControl: classType.accessControl,
                    isLibCall: info.isLibCall,
                }, this);
                return;
            }
            const plainName = name.getPlainName(ctx);
            if (this.initializer instanceof InitializerList) {
                // todo::
                throw new SyntaxError(`unsupport initial list`, this);
            }
            const oldField = classType.fields.filter((field) => field.name === plainName);
            if (oldField.length) {
                throw new SyntaxError(`duplicated field name ${plainName}`, this);
            }
            classType.fields.push({
                name: plainName,
                type,
                startOffset: classType.objectSize,
                initializer: this.initializer,
                accessControl: classType.accessControl,
            });
            if (!classType.isUnion) {
                classType.objectSize += type.length;
                classType.selfSize += type.length;
            }
        }
    }
}
