const TestBase = require('../integration/testbase');

describe('limits.h', function () {
    it('exposes GCC-style integer limit macros', async function() {
        const testCode = `
#include <limits.h>
#include <iostream>
using namespace std;

int main() {
    cout << CHAR_BIT << " ";
    cout << SCHAR_MIN << " " << SCHAR_MAX << " " << UCHAR_MAX << " ";
    cout << CHAR_MIN << " " << CHAR_MAX << " ";
    cout << MB_LEN_MAX << " ";
    cout << SHRT_MIN << " " << SHRT_MAX << " " << USHRT_MAX << " ";
    cout << INT_MIN << " " << INT_MAX << " " << UINT_MAX << " ";
    cout << LONG_MIN << " " << LONG_MAX << " " << ULONG_MAX << " ";
    cout << LLONG_MIN << " " << LLONG_MAX;
    return 0;
}
        `;
        const expectOutput = `8 -128 127 255 -128 127 16 -32768 32767 65535 -2147483648 2147483647 4294967295 -2147483648 2147483647 4294967295 -9223372036854775808 9223372036854775807`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('keeps legacy limit.h as a compatibility wrapper', async function() {
        const testCode = `
#include <limit.h>
#include <iostream>
using namespace std;

int main() {
    cout << INT_MAX << " " << UINT_MAX;
    return 0;
}
        `;
        const expectOutput = `2147483647 4294967295`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });
});
