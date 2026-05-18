/**
 *  @file
 *  @author zcy <zurl@live.com>
 *  Created at 08/07/2018
 */
import {Runtime} from "../runtime/runtime";

export function write(this: Runtime, fd: number, ptr: number, size: number): number {
    if (fd >= this.files.length) {
        return -1;
    }
    const file = this.files[fd];
    return file.write(this.memory.buffer.slice(ptr, ptr + size));
}

export function __cout_str(this: Runtime, ptr: number): void {
    let end = ptr;
    while (this.memory.getUint8(end) !== 0) {
        end++;
    }
    this.files[1].write(this.memory.buffer.slice(ptr, end));
}

export function __container_error(this: Runtime, message: number): void {
    throw new RangeError(this.readMemoryString(message));
}

export function __input_error(this: Runtime, message: number): void {
    throw new RangeError(this.readMemoryString(message));
}

export function __loop_tick(this: Runtime): void {
    this.loopIterations++;
    if (this.loopIterations > this.maxLoopIterations) {
        throw new RangeError("maximum loop iterations exceeded");
    }
}

export function read(this: Runtime, fd: number, ptr: number, size: number): number {
    if (fd >= this.files.length) {
        return -1;
    }
    const file = this.files[fd];
    return file.read(this.memory.buffer, ptr, size);
}


export function dump_stack_info(this: Runtime): void {
    console.log("$sp = " + this.sp);
}

export function time(this: Runtime, ptr: number): number {
    return Math.round((new Date()).getTime() / 1000);
}


export function __print_stack(this: Runtime) {
    this.printStack();
}

export * from "./math";
export * from "./stdio";
export * from "./string";
export * from "./ctype";
export * from "./stdlib";
