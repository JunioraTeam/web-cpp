import {SyntaxError} from "../../common/error";
import {SourceLocation} from "../../common/node";
import {AddressType, Variable} from "../../common/symbol";
import {AccessControl, Type} from "../../type";
import {ClassType} from "../../type/class_type";
import {ArrayType, PointerType, ReferenceType} from "../../type/compound_type";
import {PrimitiveTypes} from "../../type/primitive_type";
import {I32Binary, WBinaryOperation, WBlock, WBr, WConst, WIfElseBlock, WStatement, WType} from "../../wasm";
import {WAddressHolder} from "../address";
import {CompileContext, TryContext} from "../context";
import {doTypeTransfrom} from "../conversion";
import {doStrictTypeMatch, doWeakTypeMatch} from "../overload";
import {AnonymousExpression} from "../expression/anonymous_expression";
import {AssignmentExpression} from "../expression/assignment_expression";
import {Expression, recycleExpressionResult} from "../expression/expression";
import {ParameterDeclaration} from "../function/parameter_declaration";
import {CompoundStatement} from "./compound_statement";
import {Statement} from "./statement";

// the value of an exception is kept in a slot of the frame, this is the smallest one used
const MINIMUM_EXCEPTION_SLOT_SIZE = 8;

/**
 * a handler catches its own type, a base class of it, or a pointer it can be converted to,
 * but never something that would merely be convertible, `catch (double)` does not take an int
 */
function matchesHandlerType(handlerType: Type, thrownType: Type): boolean {
    if (doStrictTypeMatch(handlerType, thrownType)) {
        return true;
    }
    if (handlerType instanceof ClassType && thrownType instanceof ClassType) {
        return thrownType.isSubClassOf(handlerType);
    }
    return handlerType instanceof PointerType && thrownType instanceof PointerType
        && doWeakTypeMatch(handlerType, thrownType);
}

export function getExceptionTypeKey(type: Type): string {
    if (type instanceof ReferenceType) {
        type = type.elementType;
    }
    if (type instanceof ArrayType) {
        type = new PointerType(type.elementType);
    }
    return type.toString();
}

export class ExceptionHandler extends Statement {
    public declaration: ParameterDeclaration | null;
    public body: CompoundStatement;

    constructor(location: SourceLocation, declaration: ParameterDeclaration | null,
                body: CompoundStatement) {
        super(location);
        this.declaration = declaration;
        this.body = body;
    }

    public isCatchAll(): boolean {
        return this.declaration === null;
    }

    public getCaughtType(ctx: CompileContext): Type | null {
        return this.declaration === null ? null : this.declaration.getType(ctx);
    }

    public codegen(ctx: CompileContext): void {
        throw new SyntaxError(`a catch clause must follow a try block`, this);
    }
}

/**
 * wasm has no unwinding, so a `throw` can only reach a `try` that lexically encloses it inside
 * the same function. The try body becomes a block, a throw stores the value and branches out of
 * it, and the handlers run right after that block.
 *
 *     block EXIT ( block CATCH ( <try body> br EXIT ) <handler dispatch> )
 */
export class TryBlock extends Statement {
    public body: CompoundStatement;
    public handlers: ExceptionHandler[];

    constructor(location: SourceLocation, body: CompoundStatement, handlers: ExceptionHandler[]) {
        super(location);
        this.body = body;
        this.handlers = handlers;
    }

    public codegen(ctx: CompileContext): void {
        const handlerTypes: Array<{ type: Type, index: number }> = [];
        let catchAll = -1;
        let valueSize = MINIMUM_EXCEPTION_SLOT_SIZE;
        for (let i = 0; i < this.handlers.length; i++) {
            const handler = this.handlers[i];
            if (handler.isCatchAll()) {
                if (catchAll !== -1) {
                    throw new SyntaxError(`duplicated catch(...) clause`, handler);
                }
                catchAll = i;
                continue;
            }
            const type = handler.getCaughtType(ctx)!;
            if (type instanceof ReferenceType) {
                throw new SyntaxError(`catching by reference is not supported`, handler);
            }
            handlerTypes.push({type, index: i});
            valueSize = Math.max(valueSize, type.length);
        }

        const baseLevel = ctx.currentFuncContext.blockLevel;
        const typeSlot = new WAddressHolder(ctx.memory.allocStack(4), AddressType.STACK, this.location);
        const valueSlot = new WAddressHolder(ctx.memory.allocStack(valueSize),
            AddressType.STACK, this.location);
        const savedContainer = ctx.getStatementContainer();

        const tryContext: TryContext = {
            handlerTypes,
            hasCatchAll: catchAll !== -1,
            catchLevel: baseLevel + 2,
            typeSlot,
            valueSlot,
        };

        const tryContainer: WStatement[] = [];
        ctx.setStatementContainer(tryContainer);
        ctx.currentFuncContext.blockLevel = baseLevel + 2;
        ctx.currentFuncContext.tryContexts.push(tryContext);
        this.body.codegen(ctx);
        ctx.currentFuncContext.tryContexts.pop();
        // the body ran to the end, jump over the handlers
        ctx.submitStatement(new WBr(1, this.location));

        const handlers = this.codegenHandlers(ctx, tryContext, catchAll, baseLevel);
        ctx.currentFuncContext.blockLevel = baseLevel;
        ctx.setStatementContainer(savedContainer);

        ctx.submitStatement(new WBlock([
            new WBlock(tryContainer, this.location),
            ...handlers,
        ], this.location));
    }

    private codegenHandlers(ctx: CompileContext, tryContext: TryContext, catchAll: number,
                            baseLevel: number): WStatement[] {
        const typed = this.handlers
            .map((handler, index) => ({handler, index}))
            .filter((item) => !item.handler.isCatchAll());
        // the handlers sit in the exit block, and the else-if chain adds one level per condition
        const catchAllBody = catchAll === -1 ? null
            : this.codegenHandlerBody(ctx, this.handlers[catchAll], tryContext,
                baseLevel + 1 + typed.length);
        let result: WStatement[] | null = catchAllBody;
        for (let i = typed.length - 1; i >= 0; i--) {
            const {handler, index} = typed[i];
            const body = this.codegenHandlerBody(ctx, handler, tryContext, baseLevel + 2 + i);
            const condition = new WBinaryOperation(I32Binary.eq,
                tryContext.typeSlot.createLoad(ctx, PrimitiveTypes.int32),
                new WConst(WType.i32, index.toString(), this.location),
                this.location);
            result = [new WIfElseBlock(condition, body, result, this.location)];
        }
        return result === null ? [] : result;
    }

    private codegenHandlerBody(ctx: CompileContext, handler: ExceptionHandler,
                               tryContext: TryContext, blockLevel: number): WStatement[] {
        const savedContainer = ctx.getStatementContainer();
        const container: WStatement[] = [];
        ctx.setStatementContainer(container);
        ctx.currentFuncContext.blockLevel = blockLevel;
        ctx.scopeManager.enterUnnamedScope(false);
        try {
            if (handler.declaration !== null && handler.declaration.declarator !== null) {
                const type = handler.getCaughtType(ctx)!;
                const name = handler.declaration.getName(ctx);
                ctx.scopeManager.declare(name, new Variable(name,
                    ctx.scopeManager.getFullName(name), ctx.fileName, type,
                    AddressType.STACK, tryContext.valueSlot.place as number,
                    AccessControl.Public), handler);
            }
            handler.body.codegen(ctx);
        } finally {
            ctx.scopeManager.exitScope();
            ctx.setStatementContainer(savedContainer);
        }
        return container;
    }
}

export class ThrowStatement extends Statement {
    public argument: Expression | null;

    constructor(location: SourceLocation, argument: Expression | null) {
        super(location);
        this.argument = argument;
    }

    public codegen(ctx: CompileContext): void {
        if (this.argument === null) {
            throw new SyntaxError(`rethrowing with a bare throw is not supported`, this);
        }
        const thrownType = doTypeTransfrom(this.argument.deduceType(ctx));
        const contexts = ctx.currentFuncContext.tryContexts;
        for (let i = contexts.length - 1; i >= 0; i--) {
            const context = contexts[i];
            const handler = context.handlerTypes
                .filter((item) => matchesHandlerType(item.type, thrownType))[0];
            if (handler === undefined && !context.hasCatchAll) {
                continue;
            }
            if (handler !== undefined) {
                const target = new AnonymousExpression(this.location, {
                    type: handler.type,
                    expr: context.valueSlot,
                    isLeft: true,
                });
                recycleExpressionResult(ctx, this, new AssignmentExpression(this.location, "=",
                    target, this.argument).codegen(ctx));
            }
            ctx.submitStatement(context.typeSlot.createStore(ctx, PrimitiveTypes.int32,
                new WConst(WType.i32, (handler === undefined ? -1 : handler.index).toString(),
                    this.location), true));
            ctx.submitStatement(new WBr(ctx.currentFuncContext.blockLevel - context.catchLevel,
                this.location));
            return;
        }
        throw new SyntaxError(`no enclosing try block in this function catches `
            + getExceptionTypeKey(thrownType), this);
    }
}
