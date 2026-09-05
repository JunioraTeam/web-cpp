const TestBase = require('../integration/testbase');

describe('std::iomanip', function () {
    it('sets the number of significant digits with setprecision', async function() {
        const testCode = `
#include <iomanip>
#include <iostream>
using namespace std;

int main() {
    cout << setprecision(2) << 3.14159 << " ";
    cout << setprecision(4) << 3.14159 << " " << 2.0;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `3.1 3.142 2`, {isCpp: true});
    });

    it('counts decimals instead of digits after fixed', async function() {
        const testCode = `
#include <iomanip>
#include <iostream>
using namespace std;

int main() {
    cout << fixed << setprecision(2) << 3.14159 << " " << 2.0 << " ";
    cout << defaultfloat << 2.0;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `3.14 2.00 2`, {isCpp: true});
    });

    it('pads a single value to the width given by setw', async function() {
        const testCode = `
#include <iomanip>
#include <iostream>
using namespace std;

int main() {
    cout << "[" << setw(5) << 42 << "]";
    cout << "[" << setw(6) << "ab" << "]";
    cout << "[" << setw(4) << 1 << 2 << "]";
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `[   42][    ab][   12]`, {isCpp: true});
    });

    it('changes the padding side and the padding character', async function() {
        const testCode = `
#include <iomanip>
#include <iostream>
using namespace std;

int main() {
    cout << "[" << left << setw(5) << 42 << "]";
    cout << "[" << right << setw(5) << 42 << "]";
    cout << setfill('0') << setw(4) << 7;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `[42   ][   42]0007`, {isCpp: true});
    });

    it('works through the std namespace without a using declaration', async function() {
        const testCode = `
#include <iomanip>
#include <iostream>

int main() {
    std::cout << std::setw(4) << std::setfill('.') << 7 << " ";
    std::cout << std::setprecision(3) << 1.23456;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `...7 1.23`, {isCpp: true});
    });

    it('leaves the default formatting of cout alone', async function() {
        const testCode = `
#include <iomanip>
#include <iostream>
using namespace std;

int main() {
    cout << 3.5 << " " << 42 << " " << "text" << " " << 1.0 / 3.0;
    return 0;
}
        `;
        return await TestBase.testFullCode(testCode, `3.5 42 text 0.333333`, {isCpp: true});
    });
});
