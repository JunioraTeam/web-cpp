const TestBase = require('./testbase');

describe('operator overloads and references', function () {
    it('calls a free operator when the left operand is a class', async function () {
        const testCode = `
#include <iostream>
using namespace std;

struct Money { int amount; };

bool operator==(Money left, Money right) { return left.amount == right.amount; }
bool operator<(const Money& left, const Money& right) { return left.amount < right.amount; }
Money operator+(Money left, Money right) {
    Money result;
    result.amount = left.amount + right.amount;
    return result;
}

int main() {
    Money one, two;
    one.amount = 1;
    two.amount = 2;
    cout << (one == two) << (one < two) << (one + two).amount;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `013`, {isCpp: true});
    });

    it('calls a free operator when only the right operand is a class', async function () {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

struct Money { int amount; };

Money operator*(int factor, Money value) {
    Money result;
    result.amount = factor * value.amount;
    return result;
}

int main() {
    Money value;
    value.amount = 3;
    cout << (2 * value).amount << " ";
    string tail = "ho";
    cout << (string("hi") + tail);
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `6 hiho`, {isCpp: true});
    });

    it('prefers a member operator over a free one', async function () {
        const testCode = `
#include <iostream>
using namespace std;

struct Counter {
    int value;
    int operator+(int other) { return value + other; }
};

int operator+(Counter counter, double other) { return 999; }

int main() {
    Counter counter;
    counter.value = 1;
    cout << (counter + 2);
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `3`, {isCpp: true});
    });

    it('finds a stream operator in the namespace of its operands', async function () {
        const testCode = `
#include <iostream>

namespace shapes {
    struct Dot { int size; };
    std::ostream& operator<<(std::ostream& stream, Dot dot) {
        stream << "dot" << dot.size;
        return stream;
    }
}

int main() {
    shapes::Dot dot;
    dot.size = 4;
    std::cout << dot;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `dot4`, {isCpp: true});
    });

    it('binds a temporary to a reference to const', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int identity(const int& value) { return value; }
double twice(const double& value) { return value * 2; }
int add(const int& left, const int& right) { return left + right; }

int main() {
    int variable = 4;
    cout << identity(3) << identity(variable) << identity(variable + 1) << " ";
    cout << twice(1.5) << " " << add(1, 2) << " " << identity('A');
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `345 3 3 65`, {isCpp: true});
    });
});

describe('integer width conversions', function () {
    it('widens narrow integers to 64 bit and to floating point', async function () {
        const testCode = `
#include <iostream>
#include <string>
using namespace std;

int main() {
    short small = 300;
    char letter = 65;
    unsigned char byte = 200;
    long long widened = (long long) small;
    double asDouble = letter;
    cout << widened << " " << to_string((long long) small) << " ";
    cout << (long long) letter << " " << (long long) byte << " " << asDouble;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `300 300 65 200 65`, {isCpp: true});
    });

    it('prints unsigned values and the extremes of the signed types', async function () {
        const testCode = `
#include <climits>
#include <iostream>
using namespace std;

int main() {
    unsigned int large = 4294967295u;
    cout << large << " " << UINT_MAX << " " << ULONG_MAX << " ";
    cout << LLONG_MIN << " " << LLONG_MAX << " " << INT_MIN;
    return 0;
}
        `;
        const expectOutput = `4294967295 4294967295 4294967295 `
            + `-9223372036854775808 9223372036854775807 -2147483648`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('wraps 32 bit arithmetic the same way in both runtimes', async function () {
        const testCode = `
#include <climits>
#include <cstdlib>
#include <iostream>
using namespace std;

int main() {
    cout << abs(INT_MIN) << " " << (INT_MAX + 1) << " " << (INT_MIN - 1);
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `-2147483648 -2147483648 2147483647`, {isCpp: true});
    });
});
