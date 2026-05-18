import {SourceLocation} from "../../common/node";
import {Type} from "../../type";
import {TypeName} from "../class/type_name";
import {CompileContext} from "../context";
import {doConversion} from "../conversion";
import {Expression, ExpressionResult} from "./expression";

export class CastExpression extends Expression {
    public typeName: TypeName;
    public operand: Expression;
    public kind: string;

    constructor(location: SourceLocation, typeName: TypeName, operand: Expression, kind: string = "c") {
        super(location);
        this.typeName = typeName;
        this.operand = operand;
        this.kind = kind;
    }

    public codegen(ctx: CompileContext): ExpressionResult {
        const type = this.deduceType(ctx);
        const expr = this.operand.codegen(ctx);
        return {
            type,
            expr: doConversion(ctx, type, expr, this, true, false, this.kind),
            isLeft: false,
        };
    }

    public deduceType(ctx: CompileContext): Type {
        return this.typeName.deduceType(ctx);
    }

}
