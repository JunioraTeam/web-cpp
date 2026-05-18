import {InternalError} from "../../common/error";
import {Node} from "../../common/node";
import {Variable} from "../../common/symbol";
import {ClassType} from "../../type/class_type";
import {ArrayType} from "../../type/compound_type";
import {CompileContext} from "../context";
import {BinaryExpression} from "../expression/binary_expression";
import {recycleExpressionResult} from "../expression/expression";
import {Identifier} from "../expression/identifier";
import {IntegerConstant} from "../expression/integer_constant";
import {SubscriptExpression} from "../expression/subscript_expression";
import {CallExpression} from "../function/call_expression";
import {ExpressionStatement} from "../statement/expression_statement";
import {getForLoop} from "../statement/for_statement";
import {MemberExpression} from "./member_expression";

export function triggerDestructor(ctx: CompileContext, obj: Variable, node: Node) {
    const classType = obj.type;
    if (!(classType instanceof ClassType)) {
        throw new InternalError(`triggerDestructor()`);
    }
    const fullName = classType.fullName + "::~" + classType.shortName;
    const dtor = ctx.scopeManager.lookup(fullName);
    if (dtor === null) {
        return;
    }
    recycleExpressionResult(ctx, node,
        new CallExpression(node.location,
            new MemberExpression(node.location, Identifier.fromString(node.location, obj.shortName),
                false, Identifier.fromString(node.location, "~" + classType.shortName)), [],
        ).codegen(ctx));

}

export function triggerAllDestructor(ctx: CompileContext, node: Node) {
    for (const item of ctx.scopeManager.currentContext.scope.map.values()) {
        const x = item[0];
        if (x instanceof Variable && x.type instanceof ClassType) {
            triggerDestructor(ctx, x, node);
        } else if (x instanceof Variable && x.type instanceof ArrayType && x.type.elementType instanceof ClassType) {
            const classType = x.type.elementType;
            const size = x.type.size;
            const dtorName = "~" + classType.shortName;
            getForLoop(IntegerConstant.fromNumber(node.location, size), (i) => {
                const reverseIndex = new BinaryExpression(node.location, "-",
                    IntegerConstant.fromNumber(node.location, size - 1), i);
                const element = new SubscriptExpression(node.location,
                    Identifier.fromString(node.location, x.shortName), reverseIndex);
                return [new ExpressionStatement(node.location,
                    new CallExpression(node.location,
                        new MemberExpression(node.location, element, false,
                            Identifier.fromString(node.location, dtorName)), []))];
            }, node).codegen(ctx);
        }
    }
}
