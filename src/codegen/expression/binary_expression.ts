import {InternalError, SyntaxError, TypeError} from "../../common/error";
import {Node, Position, SourceLocation} from "../../common/node";
import {Type} from "../../type";
import {ClassType} from "../../type/class_type";
import {PointerType} from "../../type/compound_type";
import {ArithmeticType, IntegerType, PrimitiveTypes} from "../../type/primitive_type";
import {BinaryOperator, getOpFromStr, I32Binary, WBinaryOperation, WConst, WType} from "../../wasm";
import {MemberExpression} from "../class/member_expression";
import {CompileContext} from "../context";
import {arithmeticDeduce, doConversion, doTypeTransfrom, doValueTransform} from "../conversion";
import {CallExpression} from "../function/call_expression";
import {Expression, ExpressionResult, recycleExpressionResult} from "./expression";
import {Identifier} from "./identifier";
import {UnaryExpression} from "./unary_expression";
export class BinaryExpression extends Expression {
    public operator: string;
    // + - * / % & | && || < > <= >= == !=
    public left: Expression;
    public right: Expression;

    constructor(location: SourceLocation, operator: string, left: Expression, right: Expression) {
        super(location);
        if (typeof operator[1] === "undefined") { // HACK: for rule '&'!'&' this will receive ["&", undefined]
            this.operator = operator[0];
        } else {
            this.operator = operator;
        }
        this.left = left;
        this.right = right;
    }

    public codegen(ctx: CompileContext): ExpressionResult {

        if (this.operator === ",") {
            recycleExpressionResult(ctx, this, this.left.codegen(ctx));
            return this.right.codegen(ctx);
        }

        const leftType = doTypeTransfrom(this.left.deduceType(ctx));
        const rightType = doTypeTransfrom(this.right.deduceType(ctx));

        if (this.isPairComparison(leftType, rightType)) {
            return this.createPairComparisonExpression().codegen(ctx);
        }

        if (leftType instanceof ClassType) {
            return this.createOperatorCall(ctx, leftType, rightType).codegen(ctx);
        }

        if (rightType instanceof ClassType) {
            throw new SyntaxError(`current not support right overload`, this);
        }

        let left = this.left.codegen(ctx);
        let right = this.right.codegen(ctx);

        const dstType = this.deduceType(ctx);
        if (this.operator === "-"
            && leftType instanceof PointerType
            && rightType instanceof PointerType) {
            left = doValueTransform(ctx, left, this);
            right = doValueTransform(ctx, right, this);
            const leftExpr = left.expr;
            const rightExpr = right.expr;
            const byteDiff = new WBinaryOperation(I32Binary.sub, leftExpr, rightExpr, this.location);
            return {
                type: PrimitiveTypes.int32,
                isLeft: false,
                expr: new WBinaryOperation(I32Binary.div_s, byteDiff,
                    new WConst(WType.i32, leftType.elementType.length.toString(), this.location),
                    this.location),
            };
        }
        const op = getOpFromStr(this.operator, dstType.toWType());

        if (op === null) {
            throw new InternalError(`unsupport op ${this.operator}`);
        }

        if (dstType instanceof PointerType) {
            if (left.type instanceof IntegerType) {
                left = doValueTransform(ctx, left, this);
                left = {
                    type: dstType,
                    isLeft: false,
                    expr: new WBinaryOperation(I32Binary.mul, left.expr,
                        new WConst(WType.u32, dstType.elementType.length.toString(), this.location), this.location),
                };
            } else if (right.type instanceof IntegerType) {
                right = doValueTransform(ctx, right, this);
                right = {
                    type: dstType,
                    isLeft: false,
                    expr: new WBinaryOperation(I32Binary.mul, right.expr,
                        new WConst(WType.u32, dstType.elementType.length.toString(), this.location), this.location),
                };
            }
        }

        let operandType = dstType;
        if ([">=", "<=", ">", "<", "==", "!="].includes(this.operator)) {
            if (leftType instanceof ArithmeticType && rightType instanceof ArithmeticType) {
                operandType = arithmeticDeduce(leftType, rightType);
            } else if (leftType instanceof PointerType && rightType instanceof PointerType) {
                operandType = leftType;
            }
        }
        if (leftType instanceof PointerType && rightType instanceof PointerType) {
            operandType = PrimitiveTypes.int32;
        }

        let leftExpr;
        let rightExpr;
        if (operandType === PrimitiveTypes.int32
            && leftType instanceof PointerType && rightType instanceof PointerType) {
            left = doValueTransform(ctx, left, this);
            right = doValueTransform(ctx, right, this);
            leftExpr = left.expr;
            rightExpr = right.expr;
        } else {
            leftExpr = doConversion(ctx, operandType, left, this);
            rightExpr = doConversion(ctx, operandType, right, this);
        }

        if (this.operator === "&&" || this.operator === "||") {
            leftExpr = new WBinaryOperation(I32Binary.ne, leftExpr,
                new WConst(WType.i32, "0", this.location), this.location);
            rightExpr = new WBinaryOperation(I32Binary.ne, rightExpr,
                new WConst(WType.i32, "0", this.location), this.location);
        }

        return {
            type: dstType,
            isLeft: false,
            expr: new WBinaryOperation(
                op as BinaryOperator,
                leftExpr,
                rightExpr,
                this.location,
            ),
        };
    }

    public deduceType(ctx: CompileContext): Type {
        const left = doTypeTransfrom(this.left.deduceType(ctx));
        const right = doTypeTransfrom(this.right.deduceType(ctx));

        if (this.isPairComparison(left, right)) {
            return PrimitiveTypes.bool;
        }

        if (left instanceof ClassType) {
            return this.createOperatorCall(ctx, left, right).deduceType(ctx);
        }

        if ("+-*%/".includes(this.operator)) {
            if (left instanceof ArithmeticType && right instanceof ArithmeticType) {
                return arithmeticDeduce(left, right);
            } else if (left instanceof PointerType || right instanceof PointerType) {
                if (left instanceof PointerType && right instanceof PointerType) {
                    if (this.operator === "-") {
                        return PrimitiveTypes.int32;
                    }
                    throw new TypeError(`could not apply ope on two pointer`, this);
                }
                if (left instanceof PointerType) {
                    if (!(right instanceof IntegerType)) {
                        throw new TypeError(`could not apply ${right.toString()} to pointer`, this);
                    }
                    return left;
                } else if (right instanceof PointerType) {
                    if (!(left instanceof IntegerType)) {
                        throw new TypeError(`could not apply ${left.toString()} to pointer`, this);
                    }
                    if (this.operator === "-") {
                        throw new TypeError(`could - a pointer`, this);
                    }
                    return right;
                } else {
                    throw new TypeError(`bad operator on pointer`, this);
                }
            } else {
                throw new TypeError(`could not apply ${this.operator} on ${left.toString()}`
                    + ` and ${right.toString()}`, this);
            }
        } else if ([">=", "<=", ">", "<", "==", "!="].includes(this.operator)) {
            if (left instanceof ArithmeticType && right instanceof ArithmeticType) {
                return PrimitiveTypes.bool;
            }
            if (left instanceof PointerType && right instanceof PointerType) {
                return PrimitiveTypes.bool;
            }
            throw new TypeError(`unsupport relation compute`, this);
        } else if (["&&", "||"].includes(this.operator)) {
            return PrimitiveTypes.bool;
        } else if (["&", "|", "^", ">>", "<<"].includes(this.operator)) {
            if ( !( left instanceof IntegerType && right instanceof IntegerType)) {
                throw new TypeError(`binary operator could only be applied on integer`, this);
            }
            return PrimitiveTypes.int32;
        } else if (this.operator === ",") {
            return this.right.deduceType(ctx);
        }
        throw new InternalError(`no impl at BinaryExpression()`);
    }

    private createOperatorCall(ctx: CompileContext, leftType: ClassType, rightType: Type) {
        const memberName = "#" + this.operator;
        if (leftType.getMember(ctx, memberName) === null) {
            throw new SyntaxError(`no match for 'operator${this.operator}' (operand types are `
                + `'${leftType.toString()}' and '${rightType.toString()}')`, {
                location: this.getOperatorLocation(),
            } as Node);
        }
        return new CallExpression(this.location,
            new MemberExpression(this.location, this.left, false,
                Identifier.fromString(this.location, memberName)),
            [this.right]);
    }

    private isPairComparison(leftType: Type, rightType: Type): boolean {
        return leftType instanceof ClassType
            && rightType instanceof ClassType
            && leftType.shortName.split("<")[0] === "pair"
            && rightType.shortName.split("<")[0] === "pair"
            && ["==", "!=", "<", ">", "<=", ">="].includes(this.operator);
    }

    private member(object: Expression, name: string): MemberExpression {
        return new MemberExpression(this.location, object, false, Identifier.fromString(this.location, name));
    }

    private createPairLessExpression(left: Expression, right: Expression): Expression {
        const leftFirst = this.member(left, "first");
        const leftSecond = this.member(left, "second");
        const rightFirst = this.member(right, "first");
        const rightSecond = this.member(right, "second");
        return new BinaryExpression(this.location, "||",
            new BinaryExpression(this.location, "<", leftFirst, rightFirst),
            new BinaryExpression(this.location, "&&",
                new UnaryExpression(this.location, "!",
                    new BinaryExpression(this.location, "<", rightFirst, leftFirst)),
                new BinaryExpression(this.location, "<", leftSecond, rightSecond)));
    }

    private createPairEqualExpression(): Expression {
        return new BinaryExpression(this.location, "&&",
            new BinaryExpression(this.location, "==",
                this.member(this.left, "first"), this.member(this.right, "first")),
            new BinaryExpression(this.location, "==",
                this.member(this.left, "second"), this.member(this.right, "second")));
    }

    private createPairComparisonExpression(): Expression {
        if (this.operator === "==") {
            return this.createPairEqualExpression();
        }
        if (this.operator === "!=") {
            return new UnaryExpression(this.location, "!", this.createPairEqualExpression());
        }
        if (this.operator === "<") {
            return this.createPairLessExpression(this.left, this.right);
        }
        if (this.operator === ">") {
            return this.createPairLessExpression(this.right, this.left);
        }
        if (this.operator === "<=") {
            return new UnaryExpression(this.location, "!",
                this.createPairLessExpression(this.right, this.left));
        }
        if (this.operator === ">=") {
            return new UnaryExpression(this.location, "!",
                this.createPairLessExpression(this.left, this.right));
        }
        throw new InternalError(`invalid pair comparison operator ${this.operator}`);
    }

    private getOperatorLocation() {
        const source = this.location.source || "";
        const index = source.indexOf(this.operator);
        const prefix = index >= 0 ? source.substring(0, index) : "";
        let line = this.location.start.line;
        let column = this.location.start.column;
        for (const ch of prefix) {
            if (ch === "\n") {
                line++;
                column = 0;
            } else {
                column++;
            }
        }
        const offset = this.location.start.offset + prefix.length;
        return new SourceLocation(this.location.fileName, this.operator,
            new Position(offset, line, column),
            new Position(offset + this.operator.length, line, column + this.operator.length));
    }

}
