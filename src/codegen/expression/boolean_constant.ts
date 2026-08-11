import {SourceLocation} from "../../common/node";
import {Type} from "../../type";
import {PrimitiveTypes} from "../../type/primitive_type";
import {WConst} from "../../wasm";
import {CompileContext} from "../context";
import {Constant} from "./constant";
import {ExpressionResult} from "./expression";

export class BooleanConstant extends Constant {
    public value: boolean;

    constructor(location: SourceLocation, value: boolean) {
        super(location);
        this.value = value;
    }

    public codegen(ctx: CompileContext): ExpressionResult {
        const type = this.deduceType(ctx);
        return {
            type,
            expr: new WConst(type.toWType(), this.value ? "1" : "0", this.location),
            isLeft: false,
        };
    }

    public deduceType(ctx: CompileContext): Type {
        return PrimitiveTypes.bool;
    }

}
