const TestBase = require('./testbase');

describe('aggregates and typedefs', function () {
    it('initializes a plain struct from a braced list', async function () {
        const testCode = `
#include <iostream>
using namespace std;

struct Point { int x, y; };

int main() {
    Point full = {1, 2};
    Point partial = {3};
    Point assigned;
    assigned = {4, 5};
    cout << full.x << full.y << " " << partial.x << partial.y << " "
         << assigned.x << assigned.y;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `12 30 45`, {isCpp: true});
    });

    it('initializes nested members and array members', async function () {
        const testCode = `
#include <iostream>
using namespace std;

struct Inner { int a, b; };
struct Outer { Inner inner; int z; };
struct WithArray { int values[3]; int tail; };

int main() {
    Outer outer = {{1, 2}, 3};
    WithArray array = {{4, 5, 6}, 7};
    Inner list[2] = {{8, 9}, {10, 11}};
    cout << outer.inner.a << outer.inner.b << outer.z << " ";
    cout << array.values[0] << array.values[2] << array.tail << " ";
    cout << list[0].a << list[1].b;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `123 467 811`, {isCpp: true});
    });

    it('passes a braced list as an argument and keeps class members working', async function () {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

struct Point { int x, y; };
struct Labelled { int id; string name; };

int sum(Point point) {
    return point.x + point.y;
}

int main() {
    Labelled labelled = {1, "here"};
    cout << sum({2, 3}) << " " << labelled.id << labelled.name;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `5 1here`, {isCpp: true});
    });

    it('prefers a matching constructor over member wise initialization', async function () {
        const testCode = `
#include <iostream>
using namespace std;

struct Scaled {
    int value;
    Scaled() { value = 0; }
    Scaled(int given) { value = given * 10; }
};

int main() {
    Scaled scaled = {5};
    cout << scaled.value;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `50`, {isCpp: true});
    });

    it('declares a type with typedef over a struct or an enum', async function () {
        const testCode = `
#include <iostream>
using namespace std;

typedef struct { int x; } Anonymous;
typedef struct Tagged { int y; } Alias;
typedef enum { RED, GREEN } Colour;

int main() {
    Anonymous anonymous;
    anonymous.x = 1;
    Alias alias;
    alias.y = 2;
    Tagged tagged;
    tagged.y = 3;
    Colour colour = GREEN;
    cout << anonymous.x << alias.y << tagged.y << (int) colour;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `1231`, {isCpp: true});
    });

    it('reads a comparison of a name that also names a function template', async function () {
        const testCode = `
#include <algorithm>
#include <iostream>
using namespace std;

int main() {
    int count = 2;
    int size = 5;
    if (count < 0 || 1 + count > size) {
        cout << "out";
    } else {
        cout << "in";
    }
    int values[3] = {1, 1, 2};
    cout << count << ::std::count(values, values + 3, 1);
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `in22`, {isCpp: true});
    });
});
