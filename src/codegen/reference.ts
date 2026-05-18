/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 21/07/2018
 */
import {InternalError} from "../common/error";
import {Node} from "../common/node";
import {AddressType} from "../common/symbol";
import {Type} from "../type";
import {ClassType} from "../type/class_type";
import {ConstType, LeftReferenceType, ReferenceType} from "../type/compound_type";
import {PrimitiveTypes} from "../type/primitive_type";
import {WAddressHolder} from "./address";
import {CompileContext} from "./context";
import {ExpressionResult} from "./expression/expression";
import {FunctionLookUpResult} from "./scope";

function unwrapConstType(type: Type): Type {
    return type instanceof ConstType ? type.elementType : type;
}

export function doReferenceBinding(ctx: CompileContext, dst: ExpressionResult,
                                   src: ExpressionResult, node: Node) {
    if (dst.expr instanceof FunctionLookUpResult
        || src.expr instanceof FunctionLookUpResult) {
        throw new InternalError(`unsupport function name`);
    }

    if ( !(dst.type instanceof LeftReferenceType)) {
        throw new InternalError(`you could only bind to a reference`);
    }

    if (!(dst.isLeft) || !(dst.expr instanceof WAddressHolder)) {
        throw new InternalError(`the reference is not a left value`);
    }

    if ( src.type instanceof ReferenceType ) {

        const sr = unwrapConstType(src.type.elementType);
        const dr = unwrapConstType(dst.type.elementType);

        if ( sr instanceof ClassType && dr instanceof ClassType) {
            if ( !sr.isSubClassOf(dr) ) {
                throw new InternalError(`could not convert from ${src.type} to ${dst.type}`);
            }
        } else {
            if ( !sr.equals(dr)) {
                throw new InternalError(`could not convert from ${src.type} to ${dst.type}`);
            }
        }

        if (src.expr instanceof WAddressHolder) {
            src.expr = src.expr.createLoad(ctx, src.type);
        }

        ctx.submitStatement(dst.expr.createStore(ctx, PrimitiveTypes.uint32,
            src.expr));
    } else {
        const sr = unwrapConstType(src.type);
        const dr = unwrapConstType(dst.type.elementType);

        if ( sr instanceof ClassType && dr instanceof ClassType) {
            if ( !sr.isSubClassOf(dr) ) {
                throw new InternalError(`could not convert from ${src.type} to ${dst.type}`);
            }
        } else {
            if ( !sr.equals(dr)) {
                throw new InternalError(`could not convert from ${src.type} to ${dst.type}`);
            }
        }
        if (!src.isLeft || !(src.expr instanceof WAddressHolder)) {
            if (!(dst.type.elementType instanceof ConstType)) {
                throw new InternalError(`you could only bind to a left value`);
            }
            const storage = ctx.memory.allocStack(src.type.length);
            const holder = new WAddressHolder(storage, AddressType.STACK, node.location);
            ctx.submitStatement(holder.createStore(ctx, src.type, src.expr));
            ctx.submitStatement(dst.expr.createStore(ctx, PrimitiveTypes.uint32,
                holder.createLoadAddress(ctx)));
            return;
        }

        ctx.submitStatement(dst.expr.createStore(ctx, PrimitiveTypes.uint32,
            src.expr.createLoadAddress(ctx)));
    }

}
