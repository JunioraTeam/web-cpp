const TestBase = require('./testbase');
const {assert} = require('chai');

describe('goto and labels', function () {
    it('jumps backwards to a label to repeat a block', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main() {
    int counter = 0;
loop:
    counter++;
    if (counter < 3) {
        goto loop;
    }
    cout << counter;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `3`, {isCpp: true});
    });

    it('jumps forward over statements', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main() {
    int value = 1;
    goto done;
    value = 2;
done:
    cout << value;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `1`, {isCpp: true});
    });

    it('leaves a loop through a label', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main() {
    for (int i = 0; i < 10; i++) {
        if (i == 3) {
            goto found;
        }
    }
    cout << "missing";
    return 0;
found:
    cout << "found";
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `found`, {isCpp: true});
    });

    it('jumps between several labels and keeps loops around them working', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main() {
    int total = 0;
again:
    for (int i = 0; i < 2; i++) {
        total++;
    }
    if (total < 6) {
        goto again;
    }
    cout << total;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `6`, {isCpp: true});
    });

    it('reports a goto without a matching label', async function () {
        const testCode = `
#include <iostream>
int main() {
    goto nowhere;
}
        `;
        let thrown = null;
        try {
            await TestBase.testRun(testCode, {isCpp: true});
        } catch (e) {
            thrown = e;
        }
        assert.isNotNull(thrown, 'expected a compile error');
        assert.include(thrown.message, 'is not a label of an enclosing block');
    });
});

describe('lambdas', function () {
    it('deduces the return type of the body', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main() {
    auto twice = [](int x) { return x * 2; };
    auto less = [](int a, int b) { return a < b; };
    auto half = [](double x) { return x / 2; };
    auto shout = [](int x) { cout << x; };
    cout << twice(3) << " " << less(1, 2) << less(2, 1) << " " << half(5.0) << " ";
    shout(7);
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `6 10 2.5 7`, {isCpp: true});
    });

    it('accepts a capture list, no parameters and a trailing return type', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main() {
    auto plain = []{ return 5; };
    auto byReference = [&](int x) { return x * 3; };
    auto byValue = [=](int x) { return x + 1; };
    auto typed = [](int x) -> double { return x; };
    cout << plain() << " " << byReference(2) << " " << byValue(2) << " " << typed(3);
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `5 6 3 3`, {isCpp: true});
    });

    it('is callable in place and usable as a comparator', async function () {
        const testCode = `
#include <algorithm>
#include <iostream>
using namespace std;

int main() {
    cout << [](int x) { return x + 1; }(4) << " ";
    int values[3] = {3, 1, 2};
    sort(values, values + 3, [](int a, int b) { return a > b; });
    cout << values[0] << values[1] << values[2];
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `5 321`, {isCpp: true});
    });

    it('sees the globals around it but not the locals of the enclosing function', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int shared = 4;

int main() {
    auto read = []() { return shared; };
    cout << read();
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `4`, {isCpp: true});
    });
});

describe('try and catch', function () {
    it('runs the handler matching the thrown type', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main() {
    try {
        throw 'x';
    } catch (int error) {
        cout << "int";
    } catch (char error) {
        cout << error;
    }
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `x`, {isCpp: true});
    });

    it('skips the handlers when nothing is thrown', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main() {
    cout << "before ";
    try {
        cout << "body ";
    } catch (int error) {
        cout << "handler ";
    }
    cout << "after";
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `before body after`, {isCpp: true});
    });

    it('throws out of a loop and out of a branch', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main() {
    try {
        for (int i = 0; i < 10; i++) {
            if (i == 3) {
                throw i;
            }
        }
        cout << "not reached";
    } catch (int error) {
        cout << error;
    }
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `3`, {isCpp: true});
    });

    it('catches a string literal, a class and anything at all', async function () {
        const testCode = `
#include <iostream>
using namespace std;

struct Failure { int code; };

int main() {
    try {
        throw "broken";
    } catch (const char *message) {
        cout << message << " ";
    }
    try {
        Failure failure;
        failure.code = 42;
        throw failure;
    } catch (Failure failure) {
        cout << failure.code << " ";
    }
    try {
        throw 2.5;
    } catch (int error) {
        cout << "int";
    } catch (...) {
        cout << "any";
    }
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `broken 42 any`, {isCpp: true});
    });

    it('lets an inner handler throw on to the outer one', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main() {
    try {
        try {
            throw 1;
        } catch (int error) {
            cout << "inner" << error << " ";
            throw 2.5;
        }
    } catch (double error) {
        cout << "outer" << error;
    }
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `inner1 outer2.5`, {isCpp: true});
    });

    it('reports a throw that no enclosing try in the function catches', async function () {
        const testCode = `
#include <iostream>
int main() {
    throw 1;
}
        `;
        let thrown = null;
        try {
            await TestBase.testRun(testCode, {isCpp: true});
        } catch (e) {
            thrown = e;
        }
        assert.isNotNull(thrown, 'expected a compile error');
        assert.include(thrown.message, 'no enclosing try block in this function catches int');
    });
});
