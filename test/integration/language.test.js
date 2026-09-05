const TestBase = require('./testbase');
const {assert} = require('chai');

describe('language features', function () {
    it('declares enums and uses the tag as a type name', async function () {
        const testCode = `
#include <iostream>
using namespace std;

enum Color { RED, GREEN, BLUE };

int main() {
    Color chosen = GREEN;
    cout << (int) chosen << RED << BLUE;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `102`, {isCpp: true});
    });

    it('numbers enumerators after an explicit value', async function () {
        const testCode = `
#include <iostream>
using namespace std;

enum Level { LOW = 5, MEDIUM, HIGH = 10, HIGHER };

int main() {
    cout << LOW << " " << MEDIUM << " " << HIGH << " " << HIGHER;
}
        `;
        return await TestBase.testFullCode(testCode, `5 6 10 11`, {isCpp: true});
    });

    it('scopes the enumerators of an enum class', async function () {
        const testCode = `
#include <iostream>
using namespace std;

enum class Color { RED, GREEN, BLUE };

int main() {
    Color chosen = Color::BLUE;
    cout << (int) chosen << (int) Color::GREEN;
}
        `;
        return await TestBase.testFullCode(testCode, `21`, {isCpp: true});
    });

    it('declares enums inside a function', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main() {
    enum Direction { UP, DOWN };
    Direction d = DOWN;
    cout << (int) d;
}
        `;
        return await TestBase.testFullCode(testCode, `1`, {isCpp: true});
    });

    it('compares pointers against nullptr, NULL and 0', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main() {
    int value = 7;
    int *set = &value;
    int *empty = nullptr;
    cout << (empty == nullptr) << (empty == NULL) << (empty == 0) << (0 == empty);
    cout << (set == nullptr) << (set != nullptr) << (set != NULL);
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `1111011`, {isCpp: true});
    });

    it('initializes the object created by new', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main() {
    int *number = new int(5);
    double *fraction = new double(1.5);
    char *letter = new char('x');
    cout << *number << " " << *fraction << " " << *letter;
    delete number;
    delete fraction;
    delete letter;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `5 1.5 x`, {isCpp: true});
    });

    it('fills in omitted arguments from default parameters', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int describe(int a, int b = 20, int c = 300) {
    return a + b + c;
}

struct Counter {
    int step;
    Counter(int value = 2) { step = value; }
    int advance(int times = 3) { return step * times; }
};

int main() {
    cout << describe(1) << " " << describe(1, 2) << " " << describe(1, 2, 3) << " ";
    Counter counter;
    Counter explicitCounter(5);
    cout << counter.advance() << " " << counter.advance(10) << " " << explicitCounter.advance();
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `321 303 6 6 20 15`, {isCpp: true});
    });

    it('compares 64 bit integers with the right width', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main() {
    long long big = 5000000000ll;
    long long small = 3;
    cout << (big > small) << (small > big) << (big == big) << (big != small)
         << (small <= big) << (big >= small) << " ";
    int steps = 0;
    long long countdown = 3;
    while (countdown > 0) {
        countdown = countdown - 1;
        steps++;
    }
    cout << steps << " " << (int) countdown;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `101111 3 0`, {isCpp: true});
    });

    it('compares doubles with the right width', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main() {
    double left = 1.5;
    double right = 2.5;
    cout << (left < right) << (left > right) << (left == left) << (left != right);
    int steps = 0;
    for (double x = 0.0; x < 3.0; x = x + 1.0) {
        steps++;
    }
    cout << " " << steps;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `1011 3`, {isCpp: true});
    });

    it('keeps the value of a class returned from nested calls', async function () {
        const testCode = `
#include <iostream>
using namespace std;

struct Value {
    int amount;
    Value() { amount = 0; }
    Value(int value) { amount = value; }
    Value operator+(Value other) {
        Value result;
        result.amount = amount + other.amount;
        return result;
    }
};

Value make(int amount) {
    Value result(amount);
    return result;
}

int main() {
    Value a(1), b(2), c(3), d(4);
    cout << (a + b).amount << " " << (a + b + c).amount << " " << (a + b + c + d).amount << " ";
    cout << (make(5) + make(6)).amount << " " << make(7).amount;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `3 6 10 11 7`, {isCpp: true});
    });

    it('constructs class members named in the initializer list', async function () {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

struct Person {
    int age;
    string name;
    Person(int years, string who): age(years), name(who) {}
};

int main() {
    Person person(30, "Golrokh");
    cout << person.age << " " << person.name << " " << person.name.size();
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `30 Golrokh 7`, {isCpp: true});
    });
});
