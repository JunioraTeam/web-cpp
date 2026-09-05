import {Directive, SourceLocation} from "../../common/node";
import {triggerAllDestructor} from "../class/destructor";
import {CompileContext} from "../context";
import {codegenWithLabels, containsLabel} from "./label_dispatch";
import {Statement} from "./statement";

export class CompoundStatement extends Statement {
    public body: Directive[];

    constructor(location: SourceLocation, body: Directive[]) {
        super(location);
        this.body = body;
    }

    public codegen(ctx: CompileContext) {
        ctx.enterScope();
        if (containsLabel(this.body)) {
            codegenWithLabels(ctx, this, this.body);
        } else {
            this.body.map((x) => x.codegen(ctx));
        }
        triggerAllDestructor(ctx, this);
        ctx.exitScope(this);
    }
}
