import {SourceLocation} from "../../common/node";
import {CompileContext} from "../context";
import {Statement} from "./statement";

export class NullStatement extends Statement {
    constructor(location: SourceLocation) {
        super(location);
    }

    public codegen(ctx: CompileContext): void {
        return;
    }
}
