import * as fs from "fs";
import * as Long_ from "long";
import * as PegJs from "pegjs";
import {SyntaxError, TypeError} from "../common/error";
import {Node, Position, SourceLocation} from "../common/node";
import * as CTree_ from "./ast";
import CGrammar from "./c.lang";

function parseUniversalCharacter(hexSequence: string) {
    // SAFE_NUMBER: At most 0xFFFFFFFF.
    const charCode = Number.parseInt(hexSequence, 16);
    return String.fromCharCode(charCode);
}
const Helper_ = {
    parseUniversalCharacter,
};

const Keywords = new Set([
    "auto", "bool", "break", "case", "char", "class", "const", "const_cast", "continue", "default",
    "delete", "do", "double", "dynamic_cast", "else", "enum", "extern", "float", "for", "goto",
    "if", "inline", "int", "long", "namespace", "new", "operator", "override", "private",
    "protected", "public", "register", "reinterpret_cast", "return", "short", "signed", "sizeof",
    "static", "static_cast", "struct", "switch", "template", "typename", "union", "unsigned",
    "using", "virtual", "void", "volatile", "while",
]);

function keywordIdentifierAt(source: string, start: {line: number, column: number}) {
    const line = source.split("\n")[start.line - 1] || "";
    const match = /\b(?:bool|char|double|float|int|long|short|signed|unsigned|void)\s+([_A-Za-z][_A-Za-z0-9]*)\b/.exec(line);
    if (match && Keywords.has(match[1])) {
        return {
            keyword: match[1],
            column: match.index + match[0].lastIndexOf(match[1]) + 1,
        };
    }
    return null;
}

function loadParser(source: string, query: any) {
    const Long = Long_;
    const AST = CTree_;

    // cache
    if ((global as any)["window"] === undefined && fs.existsSync("/tmp/" + query.parserName + ".js")) {
        const newCode = fs.readFileSync("/tmp/" + query.parserName + ".js", "utf8");
        // if( "TranslationUnitPegParser" !== query.parserName)
        // return eval(newCode);
    }
    source = source.replace(/&!'((\\.|[^'])*)'/g, (match,
                                                   rule) => `(expected:'${rule}'? {
        if (!expected) {${rule.includes("}") ? "/*{*/" : ""}
            error('Missing \\\'${rule}\\\'');
        }
        return expected;
    })`);
    query.output = "source";
    query.cache = !!query.cache;
    query.optimize = query.optimize || "speed";
    query.trace = !!query.trace;
    if (typeof query.allowedStartRules === "string") {
        query.allowedStartRules = [query.allowedStartRules];
    }

    const code = PegJs.generate(source, query);
    // if ((global as any)["window"] === undefined) {
    //     console.log("fuck");
    //     fs.writeFileSync("/tmp/" + query.parserName + ".js", code);
    // }
    return eval(code as any);
}

const ConstantExpressionPegParser = loadParser(CGrammar,
    {parserName: "ConstantExpression", allowedStartRules: "ConstantExpression"});
const TranslationUnitPegParser = loadParser(CGrammar,
    {parserName: "TranslationUnitPegParser"});

function wrapPegParser(parser: any) {
    return {
        parse(source: string, options: any) {
            try {
                return parser.parse(source, options);
            } catch (e) {
                if (e instanceof parser.SyntaxError) {
                    const fileName = options && options.fileName ? options.fileName : "";
                    if (e.location && e.location.fileName !== undefined) {
                        throw new SyntaxError(e.message, {
                            location: e.location,
                        } as Node);
                    }
                    const start = e.location && e.location.start ?
                        e.location.start : {offset: 0, line: 1, column: 1};
                    const end = e.location && e.location.end ?
                        e.location.end : start;
                    const keyword = keywordIdentifierAt(source, start);
                    if (keyword !== null) {
                        throw new SyntaxError(`keyword '${keyword.keyword}' cannot be used as an identifier`, {
                            location: new SourceLocation(
                                fileName,
                                source,
                                new Position(start.offset, start.line, keyword.column - 1),
                                new Position(end.offset, end.line, Math.max(end.column - 1, 0)),
                            ),
                        } as Node);
                    }
                    throw new SyntaxError(e.message, {
                        location: new SourceLocation(
                            fileName,
                            source,
                            new Position(start.offset, start.line, Math.max(start.column - 1, 0)),
                            new Position(end.offset, end.line, Math.max(end.column - 1, 0)),
                        ),
                    } as Node);
                } else {
                    throw e;
                }
            }
        },
    };
}

export const ConstantExpressionParser = wrapPegParser(ConstantExpressionPegParser);
export const CParser = wrapPegParser(TranslationUnitPegParser);
