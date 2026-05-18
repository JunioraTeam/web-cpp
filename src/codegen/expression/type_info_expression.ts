import {SourceLocation} from "../../common/node";
import {Type} from "../../type";
import {TypeName} from "../class/type_name";
import {CompileContext} from "../context";
import {Expression, ExpressionResult} from "./expression";
import {StringLiteral} from "./string_literal";

export class TypeInfoExpression extends Expression {
    public target: TypeName | Expression;

    constructor(location: SourceLocation, target: TypeName | Expression) {
        super(location);
        this.target = target;
    }

    public codegen(ctx: CompileContext): ExpressionResult {
        return new StringLiteral(this.location, null, this.getTypeName(ctx) + "\0").codegen(ctx);
    }

    public deduceType(ctx: CompileContext): Type {
        return new StringLiteral(this.location, null, "").deduceType(ctx);
    }

    private getTypeName(ctx: CompileContext) {
        if (this.target instanceof TypeName) {
            return this.target.deduceType(ctx).toString();
        }
        return this.target.deduceType(ctx).toString();
    }
}
