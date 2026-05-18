/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 07/07/2018
 */
import {CodeWithSourceMap} from "source-map";
import {PreprocessError} from "../common/error";
import {Headers} from "../library";
import {Marco, Position, PreprocessContext, PreprocessStatus} from "./context";

function parseDirectiveName(line: string) {
    const match = /^#\s*([A-Za-z_]\w*)?/.exec(line);
    if (!match) {
        return "";
    }
    return match[1] ? "#" + match[1] : "#";
}

function stripDirective(line: string, directive: string) {
    return line.slice(directive.length).trim();
}

function replaceDefinedOperators(expression: string, ctx: PreprocessContext) {
    return expression
        .replace(/\bdefined\s*\(\s*([A-Za-z_]\w*)\s*\)/g, (match, name) =>
            ctx.marcoMap.has(name) ? "1" : "0")
        .replace(/\bdefined\s+([A-Za-z_]\w*)/g, (match, name) =>
            ctx.marcoMap.has(name) ? "1" : "0");
}

function expandObjectMacroForIf(token: string, ctx: PreprocessContext) {
    const marco = ctx.marcoMap.get(token);
    if (!marco || marco.parameters !== null) {
        return "0";
    }
    const target = marco.target.trim();
    return /^[-+]?\d+$/.test(target) ? target : "0";
}

function evaluatePreprocessExpression(ctx: PreprocessContext, expression: string) {
    const replacedDefined = replaceDefinedOperators(expression, ctx);
    const normalized = replacedDefined.replace(/[A-Za-z_]\w*/g, (token) => expandObjectMacroForIf(token, ctx));
    if (!/^[\d\s()+\-*/%!<>=&|^~?:.]+$/.test(normalized)) {
        throw new PreprocessError(`illegal #if expression: ${expression}`);
    }
    try {
        // The expression has been reduced to numeric literals and operators only.
        return !!Function(`"use strict"; return (${normalized});`)();
    } catch (e) {
        throw new PreprocessError(`illegal #if expression: ${expression}`);
    }
}

function enterConditional(ctx: PreprocessContext, matched: boolean) {
    const parentSkipBlock = ctx.skipBlock;
    const skipBlock = parentSkipBlock || !matched;
    ctx.status.push({
        status: PreprocessStatus.ON_IF,
        parentSkipBlock,
        branchMatched: matched && !parentSkipBlock,
        skipBlock,
    });
    ctx.skipBlock = skipBlock;
}

function currentConditional(ctx: PreprocessContext, directive: string) {
    if (ctx.status.length === 0) {
        throw new PreprocessError(`unmatch ${directive}`);
    }
    return ctx.status[ctx.status.length - 1];
}

function parseLineDirective(ctx: PreprocessContext, line: string, nextSourceLine: number) {
    const match = /^#line\s+(\d+)(?:\s+("([^"]+)"|[^\s]+))?\s*$/.exec(line);
    if (!match) {
        throw new PreprocessError(`illegal line directive: ${line}`);
    }
    ctx.setLine(nextSourceLine, Number.parseInt(match[1], 10), match[3]);
}

function quoteStringLiteral(value: string) {
    return JSON.stringify(value);
}

function replaceBuiltinMacros(ctx: PreprocessContext, str: string, sourceLocation: Position) {
    return str
        .replace(/\b__LINE__\b/g, () => String(ctx.getLogicalLine(sourceLocation.line)))
        .replace(/\b__FILE__\b/g, () => quoteStringLiteral(ctx.sourceFileName));
}

function doPreprocessCommand(ctx: PreprocessContext, line: string, lineIdx: number) {
    const directive = parseDirectiveName(line);
    const tokens = line.split(/\s|<|"/);
    if (directive === "#define") {
        if (!ctx.skipBlock) {
            const match = /#define\s+([a-zA-Z0-9_]+)\s*(\(([^)]*)\))?\s*(\s.+)?\s*$/.exec(line);
            if (!match) {
                throw new PreprocessError(`illegal define: ${line}`);
            } else if (match[3] && match[4]) {
                const parameters = match[3].split(",").map((x) => x.trim());
                ctx.defineMarco(match[1], parameters, match[4]);
            } else if (match[4]) {
                ctx.defineMarco(match[1], null, match[4]);
            } else {
                ctx.defineMarco(match[1], null, "");
            }
        }
    } else if (directive === "#undef") {
        if (!ctx.skipBlock) {
            if (tokens.length !== 2) {
                throw new PreprocessError(`illegal undefine: ${line}`);
            } else {
                ctx.undefineMarco(tokens[1]);
            }
        }
    } else if (directive === "#include") {
        if (!ctx.skipBlock) {
            let fileName = "";
            if (line.includes("\"")) {
                const match = /"(.*)"/.exec(line);
                if (match && match[1]) {
                    fileName = match[1];
                } else {
                    throw new PreprocessError(`illegal include: ${line}`);
                }
            } else {
                const match = /<(.*)>/.exec(line);
                if (match && match[1]) {
                    fileName = match[1];
                } else {
                    throw new PreprocessError(`illegal include: ${line}`);
                }
            }
            let header = Headers.get(fileName);
            if (!header) {
                if (fileName.charAt(0) === "c") {
                    header = Headers.get(fileName.slice(1) + ".h");
                }
                if (!header) {
                    throw new PreprocessError(`header ${fileName} does not exist`);
                }
            }
            const {code} = doPreprocess(fileName, header, ctx.marcoMap);
            ctx.append(code, {line: lineIdx, column: 0});
        }
    } else if (directive === "#if") {
        enterConditional(ctx, !ctx.skipBlock && evaluatePreprocessExpression(ctx, stripDirective(line, directive)));
    } else if (directive === "#elif") {
        const item = currentConditional(ctx, directive);
        if (item.status === PreprocessStatus.ON_ELSE) {
            throw new PreprocessError(`unmatch #elif`);
        }
        const matched = !item.parentSkipBlock && !item.branchMatched
            && evaluatePreprocessExpression(ctx, stripDirective(line, directive));
        item.status = PreprocessStatus.ON_ELIF;
        item.skipBlock = item.parentSkipBlock || item.branchMatched || !matched;
        item.branchMatched = item.branchMatched || matched;
        ctx.skipBlock = item.skipBlock;
    } else if (directive === "#ifdef") {
        enterConditional(ctx, !ctx.skipBlock && ctx.marcoMap.has(tokens[1]));
    } else if (directive === "#ifndef") {
        enterConditional(ctx, !ctx.skipBlock && !ctx.marcoMap.has(tokens[1]));
    } else if (directive === "#else") {
        const item = currentConditional(ctx, directive);
        if (item.status === PreprocessStatus.ON_ELSE) {
            throw new PreprocessError(`unmatch #else`);
        }
        item.status = PreprocessStatus.ON_ELSE;
        item.skipBlock = item.parentSkipBlock || item.branchMatched;
        item.branchMatched = true;
        ctx.skipBlock = item.skipBlock;
    } else if (directive === "#endif") {
        if (ctx.status.length > 0) {
            ctx.status.pop()!;
            ctx.skipBlock = ctx.status.length > 0 ? ctx.status[ctx.status.length - 1].skipBlock : false;
        } else {
            throw new PreprocessError(`unmatch #endif`);
        }
    } else if (directive === "#line") {
        if (!ctx.skipBlock) {
            parseLineDirective(ctx, line, lineIdx + 1);
        }
    } else if (directive === "#error") {
        throw new PreprocessError(`Error : ${line}`);
    } else if (directive === "#progma") {
        return;
    } else if (directive === "#") {
        return;
    } else {
        throw new PreprocessError(`unsupport directive ${line}`);
    }
}

const Tokenizer = /("[^"]*"|'[^']*'|[\\~!@#$|%^&*()+-={}[\]:";'<>?,.\/]|[A-Za-z_0-9]+|\n|[ \t]+)/y;

function tokenize(str: string): string[] {
    let match = Tokenizer.exec(str);
    const tokens: string[] = [];
    while (match) {
        tokens.push(match[1]);
        match = Tokenizer.exec(str);
    }
    return tokens;
}

export function parseMarco(parameters: string[], target: string): Array<string | number> {
    const tokens = tokenize(target);
    const result = [];
    let buffer = "";
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (i + 2 < tokens.length &&
            token === "#" &&
            tokens[i + 1] === "#" &&
            parameters.includes(tokens[i + 2])) {
            if (buffer.length !== 0) {
                result.push(buffer);
                buffer = "";
            }
            result.push(parameters.indexOf(tokens[i + 2]));
            i = i + 2;
        } else if (i + 1 < tokens.length &&
            token === "#" &&
            parameters.includes(tokens[i + 1])) {
            result.push(buffer + "\"");
            buffer = "\"";
            result.push(parameters.indexOf(tokens[i + 1]));
            i = i + 1;
        } else if (parameters.includes(token)) {
            if (buffer.length !== 0) {
                result.push(buffer);
                buffer = "";
            }
            result.push(parameters.indexOf(token));
        } else {
            buffer += token;
        }
    }
    if (buffer.length !== 0) {
        result.push(buffer);
    }
    return result;
}

function doMarcoReplace(marco: Marco, argus: string[]): string {
    return marco.parsedTarget
        .map((x) => {
            if (typeof(x) === "string") {
                return x;
            } else {
                return argus[x];
            }
        }).join("");
}

function preprocessBlock(ctx: PreprocessContext, line: string, blockStartLine: number) {
    const tokens = tokenize(line);
    if (tokens[tokens.length - 1] !== "\n") {
        tokens.push("\n");
    }
    let buffer = "", onSkip = 0;
    if (ctx.onMultiLineComment) {
        onSkip = 2;
    }
    let sourceLocation: Position = {
        line: blockStartLine,
        column: 0,
    }, bufferStartLocation: Position = {
        line: sourceLocation.line,
        column: sourceLocation.column,
    };

    function submitBuffer() {
        if (buffer.length > 0) {
            ctx.append(buffer, bufferStartLocation);
            buffer = "";
            bufferStartLocation = {
                line: sourceLocation.line,
                column: sourceLocation.column,
            };
        }
    }

    for (let i = 0; i < tokens.length - 1; i++) {
        const token = tokens[i];

        function updateSourceMap(info: string) {
            if (info === "\n") {
                sourceLocation.line++;
                sourceLocation.column = 0;
            } else {
                sourceLocation.column += info.length;
            }
        }

        if (onSkip === 1) {
            if (token === "\n") {
                buffer += token;
                onSkip = 0;
            }
            updateSourceMap(token);
            continue;
        } else if (onSkip === 2) {
            if (token === "*" && tokens[i + 1] === "/") {
                onSkip = 0;
                ctx.onMultiLineComment = false;
                i++;
            }
            updateSourceMap(token);
            continue;
        }
        if ((token.charAt(0) === "\"" && token.charAt(token.length - 1) === "\"")
            || (token.charAt(0) === "'" && token.charAt(token.length - 1) === "'")) {
            buffer += token;
            updateSourceMap(token);
            continue;
        }
        const item = ctx.marcoMap.get(token);

        function nextToken() {
            i++;
            while (i < tokens.length && /^\s*$/.test(tokens[i])) {
                i++;
            }
            if (i >= tokens.length) {
                return null;
            }
            return tokens[i];
        }

        if (item) {
            if (item.parameters === null) {
                submitBuffer();
                buffer = replaceBuiltinMacros(ctx, item.target, sourceLocation);
                updateSourceMap(token);
                submitBuffer();
            } else {
                const savedI = i;
                const savedSourceLocation = {
                    line: sourceLocation.line,
                    column: sourceLocation.column,
                };
                if (nextToken() !== "(") {
                    i = savedI;
                    sourceLocation = savedSourceLocation;
                    buffer += token;
                    updateSourceMap(tokens[i]);
                    continue;
                }
                const argus: string[] = [];
                const brace: { [key: string]: number } = {"(": 0, "[": 0, "{": 0};
                let seek = ",";
                for (let j = 0; j < item.parameters.length; j++) {
                    if (j === item.parameters.length - 1) {
                        seek = ")";
                    }
                    let word: string | null = nextToken();
                    let subBuffer = "";
                    while (!(word === seek &&
                        Object.keys(brace)
                            .map((x) => brace[x])
                            .every((x) => x === 0))) {
                        if (word === null) {
                            i = savedI;
                            sourceLocation = savedSourceLocation;
                            updateSourceMap(tokens[i]);
                            buffer += token;
                            continue;
                        }
                        if (brace.hasOwnProperty(word!)) {
                            brace[word]++;
                        }
                        if (word === ")") {
                            brace["("]--;
                        }
                        if (word === "]") {
                            brace["["]--;
                        }
                        if (word === "{") {
                            brace["{"]--;
                        }
                        subBuffer += word;
                        word = nextToken();
                    }
                    argus.push(subBuffer);
                }
                submitBuffer();
                buffer = replaceBuiltinMacros(ctx, doMarcoReplace(item, argus), savedSourceLocation);
                for (let j = savedI; j <= i; j++) {
                    updateSourceMap(tokens[j]);
                }
                submitBuffer();
                continue;
            }
        } else if (token === "__LINE__" || token === "__FILE__") {
            submitBuffer();
            buffer = replaceBuiltinMacros(ctx, token, sourceLocation);
            updateSourceMap(token);
            submitBuffer();
        } else if (token === "/" && tokens[i + 1] === "/") {
            submitBuffer();
            onSkip = 1;
        } else if (token === "/" && tokens[i + 1] === "*") {
            submitBuffer();
            onSkip = 2;
            ctx.onMultiLineComment = true;
        } else if ( token === "\n" ) {
            buffer += token;
            submitBuffer();
        } else {
            buffer += token;
        }
        updateSourceMap(token);
    }
    buffer += "\n";
    submitBuffer();
    return "";
}

function doPreprocess(fileName: string, source: string, marcoMap: Map<string, Marco>) {
    // todo:: .H buffer
    const ctx = new PreprocessContext(fileName, marcoMap);
    const lines = source.split("\n");
    let block = "", line = "";
    let blockStartLine = 0;
    for (let i = 0; i < lines.length; i++) {
        line = line + lines[i];
        if (line.charAt(line.length - 1) === "\\") {
            line = line.substring(0, line.length - 1);
        } else if (line.trimLeft().charAt(0) === "#") {
            if (ctx.onMultiLineComment) {
                block += line + "\n";
                line = "";
            } else {
                if (block !== "") {
                    if (!ctx.skipBlock) {
                        preprocessBlock(ctx, block, blockStartLine);
                    }
                    block = "";
                }
                doPreprocessCommand(ctx, line.trimLeft(), i);
                line = "";
                blockStartLine = i + 1;
            }
        } else {
            block += line + "\n";
            line = "";
        }
    }
    preprocessBlock(ctx, block, blockStartLine);
    return ctx.node.toStringWithSourceMap();
}

export function preprocess(fileName: string, source: string): CodeWithSourceMap {
    const marcoMap = new Map<string, Marco>();
    return doPreprocess(fileName, source, marcoMap);
}
