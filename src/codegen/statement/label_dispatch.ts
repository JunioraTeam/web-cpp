import {Directive, Node} from "../../common/node";
import {AddressType} from "../../common/symbol";
import {PrimitiveTypes} from "../../type/primitive_type";
import {I32Binary, WBinaryOperation, WBlock, WBr, WBrIf, WConst, WLoop, WStatement, WType} from "../../wasm";
import {WAddressHolder} from "../address";
import {CompileContext} from "../context";
import {LabeledStatement} from "./labeled_statement";
import {emitLoopTick} from "./loop_guard";

export function containsLabel(body: Directive[]): boolean {
    return body.some((item) => item instanceof LabeledStatement);
}

/**
 * wasm has no jumps, so a statement list holding labels becomes a dispatch loop: the statements
 * are cut into one segment per label and wrapped in nested blocks
 *
 *     loop  Bn( ... B1( B0( dispatch ) segment0 ) segment1 ) ... segmentN
 *
 * branching out of Bi lands at the start of segment i, running off the end of a segment
 * continues with the next one, and a goto stores the segment index and restarts the loop.
 */
export function codegenWithLabels(ctx: CompileContext, node: Node, body: Directive[]): void {
    const segments: Directive[][] = [[]];
    const labels = new Map<string, number>();
    for (const item of body) {
        if (item instanceof LabeledStatement) {
            labels.set(item.label.getPlainName(ctx), segments.length);
            segments.push([item.body]);
        } else {
            segments[segments.length - 1].push(item);
        }
    }

    const location = node.location;
    const lastIndex = segments.length - 1;
    const baseLevel = ctx.currentFuncContext.blockLevel;
    const stateVariable = new WAddressHolder(ctx.memory.allocStack(4), AddressType.STACK, location);
    const savedContainer = ctx.getStatementContainer();

    ctx.currentFuncContext.gotoContexts.push({
        labels,
        loopLevel: baseLevel + 1,
        stateVariable,
    });
    const bodies: WStatement[][] = [];
    for (let i = 0; i < segments.length; i++) {
        const container: WStatement[] = [];
        ctx.setStatementContainer(container);
        ctx.currentFuncContext.blockLevel = baseLevel + 1 + (lastIndex - i);
        segments[i].map((x) => x.codegen(ctx));
        bodies.push(container);
    }
    ctx.currentFuncContext.gotoContexts.pop();
    ctx.currentFuncContext.blockLevel = baseLevel;
    ctx.setStatementContainer(savedContainer);

    const dispatch: WStatement[] = [];
    for (let i = 1; i <= lastIndex; i++) {
        dispatch.push(new WBrIf(i, new WBinaryOperation(I32Binary.eq,
            stateVariable.createLoad(ctx, PrimitiveTypes.int32),
            new WConst(WType.i32, i.toString(), location),
            location), location));
    }
    dispatch.push(new WBr(0, location));

    let loopBody: WStatement[] = dispatch;
    for (let i = 0; i <= lastIndex; i++) {
        loopBody = [new WBlock(loopBody, location), ...bodies[i]];
    }

    const tickContainer: WStatement[] = [];
    ctx.setStatementContainer(tickContainer);
    emitLoopTick(ctx, location);
    ctx.setStatementContainer(savedContainer);

    ctx.submitStatement(stateVariable.createStore(ctx, PrimitiveTypes.int32,
        new WConst(WType.i32, "0", location), true));
    ctx.submitStatement(new WLoop([...tickContainer, ...loopBody], location));
}
