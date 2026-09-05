import {SyntaxError} from "../../common/error";
import {SourceLocation} from "../../common/node";
import {PrimitiveTypes} from "../../type/primitive_type";
import {WBr, WConst, WType} from "../../wasm";
import {CompileContext} from "../context";
import {Identifier} from "../expression/identifier";
import {Statement} from "./statement";

export class GotoStatement extends Statement {
    public label: Identifier;

    constructor(location: SourceLocation, label: Identifier) {
        super(location);
        this.label = label;
    }

    public codegen(ctx: CompileContext): void {
        const name = this.label.getPlainName(ctx);
        const contexts = ctx.currentFuncContext.gotoContexts;
        for (let i = contexts.length - 1; i >= 0; i--) {
            const context = contexts[i];
            const segment = context.labels.get(name);
            if (segment === undefined) {
                continue;
            }
            // select the segment to run, then restart the dispatch loop holding that label
            ctx.submitStatement(context.stateVariable.createStore(ctx, PrimitiveTypes.int32,
                new WConst(WType.i32, segment.toString(), this.location), true));
            ctx.submitStatement(new WBr(ctx.currentFuncContext.blockLevel - context.loopLevel,
                this.location));
            return;
        }
        throw new SyntaxError(`goto target ${name} is not a label of an enclosing block`, this);
    }
}
