import {SyntaxError} from "../../common/error";
import {Directive, Node, SourceLocation} from "../../common/node";
import {AccessControl, Type} from "../../type";
import {PointerType} from "../../type/compound_type";
import {FunctionType} from "../../type/function_type";
import {PrimitiveTypes} from "../../type/primitive_type";
import {AddressType, Variable} from "../../common/symbol";
import {WGetFunctionAddress} from "../../wasm";
import {TypeName} from "../class/type_name";
import {CompileContext} from "../context";
import {defineFunction, FunctionConfig} from "../function/function";
import {ParameterList} from "../function/parameter_list";
import {ReturnStatement} from "../function/return_statement";
import {Scope, ScopeContext} from "../scope";
import {CompoundStatement} from "../statement/compound_statement";
import {Expression, ExpressionResult} from "./expression";

let lambdaIndex = 0;

export class LambdaExpression extends Expression {
    public parameters: ParameterList;
    public body: CompoundStatement;
    public returnTypeName: TypeName | null;
    private functionType: FunctionType | null;
    private fullName: string | null;
    private emitted: boolean;

    constructor(location: SourceLocation, parameters: ParameterList, body: CompoundStatement,
                returnTypeName: TypeName | null = null) {
        super(location);
        this.parameters = parameters;
        this.body = body;
        this.returnTypeName = returnTypeName;
        this.functionType = null;
        this.fullName = null;
        this.emitted = false;
    }

    private findReturnStatement(items: Directive[]): ReturnStatement | null {
        for (const item of items) {
            if (item instanceof ReturnStatement) {
                return item;
            }
            for (const key of Object.keys(item)) {
                const child = (item as any)[key];
                const children = Array.isArray(child) ? child
                    : child instanceof Node ? [child] : [];
                const found = this.findReturnStatement(
                    children.filter((x: any) => x instanceof Node) as Directive[]);
                if (found !== null) {
                    return found;
                }
            }
        }
        return null;
    }

    /**
     * the return type of a lambda without a trailing `-> T` comes from its return expression,
     * which is deduced in a throwaway scope holding the parameters
     */
    private deduceReturnType(ctx: CompileContext): Type {
        if (this.returnTypeName !== null) {
            return this.returnTypeName.deduceType(ctx);
        }
        const returnStatement = this.findReturnStatement(this.body.body);
        if (returnStatement === null || returnStatement.argument === null) {
            return PrimitiveTypes.void;
        }
        const types = this.parameters.getTypeList(ctx);
        const names = this.parameters.getNameList(ctx);
        ctx.scopeManager.enterUnnamedScope(true);
        try {
            for (let i = 0; i < names.length; i++) {
                ctx.scopeManager.declare(names[i], new Variable(names[i], names[i], ctx.fileName,
                    types[i], AddressType.LOCAL, 0, AccessControl.Public), this);
            }
            return returnStatement.argument.deduceType(ctx);
        } finally {
            ctx.scopeManager.exitScope();
        }
    }

    private getFunctionType(ctx: CompileContext): FunctionType {
        if (this.functionType === null) {
            this.functionType = new FunctionType(this.deduceReturnType(ctx),
                this.parameters.getTypeList(ctx), false);
        }
        return this.functionType;
    }

    /**
     * a lambda without captures is a plain function, defining it inside the enclosing function
     * would nest its name below that function and hide the locals of the two from each other
     */
    private getGlobalContext(ctx: CompileContext): ScopeContext {
        const root = ctx.scopeManager.root;
        return {scope: root, activeScopes: [root]};
    }

    private getLookupScopes(ctx: CompileContext): Scope[] {
        const currentFunction = ctx.currentFuncContext.currentFunction;
        const scopes = ctx.scopeManager.currentContext.activeScopes;
        if (currentFunction === null) {
            return scopes;
        }
        // the body can see globals and namespaces but not the locals of the enclosing function
        return scopes.filter((scope) => !scope.fullName.startsWith(currentFunction.fullName));
    }

    private ensureEmitted(ctx: CompileContext) {
        if (this.emitted) {
            return;
        }
        const functionType = this.getFunctionType(ctx);
        const name = `#__lambda_${lambdaIndex++}`;
        const lookupScopes = this.getLookupScopes(ctx);
        this.fullName = ctx.scopeManager.root.fullName + "::" + name + "@" + functionType.toMangledName();
        const config: FunctionConfig = {
            name,
            functionType,
            parameterNames: this.parameters.getNameList(ctx),
            parameterInits: this.parameters.getInitList(ctx),
            accessControl: AccessControl.Public,
            isLibCall: false,
        };
        ctx.scopeManager.enterSavedScope(this.getGlobalContext(ctx));
        try {
            defineFunction(ctx, config, this.body.body, lookupScopes, this);
        } finally {
            ctx.scopeManager.exitScope();
        }
        this.emitted = true;
    }

    public codegen(ctx: CompileContext): ExpressionResult {
        this.ensureEmitted(ctx);
        if (this.fullName === null) {
            throw new SyntaxError(`lambda was not defined`, this);
        }
        return {
            type: new PointerType(this.getFunctionType(ctx)),
            expr: new WGetFunctionAddress(this.fullName, this.location),
            isLeft: false,
        };
    }

    public deduceType(ctx: CompileContext) {
        return new PointerType(this.getFunctionType(ctx));
    }
}
