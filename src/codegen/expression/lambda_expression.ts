import {AccessControl} from "../../type";
import {PointerType} from "../../type/compound_type";
import {FunctionType} from "../../type/function_type";
import {PrimitiveTypes} from "../../type/primitive_type";
import {WGetFunctionAddress} from "../../wasm";
import {SourceLocation} from "../../common/node";
import {CompileContext} from "../context";
import {defineFunction, FunctionConfig} from "../function/function";
import {ParameterList} from "../function/parameter_list";
import {CompoundStatement} from "../statement/compound_statement";
import {Expression, ExpressionResult} from "./expression";

let lambdaIndex = 0;

export class LambdaExpression extends Expression {
    public parameters: ParameterList;
    public body: CompoundStatement;
    private functionType: FunctionType | null;
    private fullName: string | null;
    private emitted: boolean;

    constructor(location: SourceLocation, parameters: ParameterList, body: CompoundStatement) {
        super(location);
        this.parameters = parameters;
        this.body = body;
        this.functionType = null;
        this.fullName = null;
        this.emitted = false;
    }

    private getFunctionType(ctx: CompileContext): FunctionType {
        if (this.functionType === null) {
            // The supported lambda surface is non-capturing predicate/comparator lambdas.
            this.functionType = new FunctionType(PrimitiveTypes.bool, this.parameters.getTypeList(ctx), false);
        }
        return this.functionType;
    }

    private ensureEmitted(ctx: CompileContext) {
        if (this.emitted) {
            return;
        }
        const functionType = this.getFunctionType(ctx);
        const name = `#__lambda_${lambdaIndex++}`;
        this.fullName = ctx.scopeManager.currentContext.scope.fullName + "::" +
            name + "@" + functionType.toMangledName();
        const config: FunctionConfig = {
            name,
            functionType,
            parameterNames: this.parameters.getNameList(ctx),
            parameterInits: this.parameters.getInitList(ctx),
            accessControl: AccessControl.Public,
            isLibCall: false,
        };
        defineFunction(ctx, config, this.body.body, ctx.scopeManager.currentContext.activeScopes, this);
        this.emitted = true;
    }

    public codegen(ctx: CompileContext): ExpressionResult {
        this.ensureEmitted(ctx);
        return {
            type: new PointerType(this.getFunctionType(ctx)),
            expr: new WGetFunctionAddress(this.fullName!, this.location),
            isLeft: false,
        };
    }

    public deduceType(ctx: CompileContext) {
        return new PointerType(this.getFunctionType(ctx));
    }
}
