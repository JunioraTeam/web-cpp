import {SourceLocation} from "../../common/node";
import {WCall, WExprStatement, WFunctionType} from "../../wasm";
import {CompileContext} from "../context";

const LOOP_TICK_NAME = "::__loop_tick";

export function emitLoopTick(ctx: CompileContext, location: SourceLocation): void {
    if (!ctx.imports.some((item) => item.name === LOOP_TICK_NAME)) {
        ctx.imports.push({
            name: LOOP_TICK_NAME,
            type: new WFunctionType([], [], location),
        });
    }
    ctx.submitStatement(new WExprStatement(new WCall(LOOP_TICK_NAME, [], [], location), location));
}
