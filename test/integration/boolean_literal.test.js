const TestBase = require('./testbase');

describe('boolean literal', function () {
    it('assigns true and false to a bool variable', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main()
{
    bool por_boodan = true;
    bool khali_boodan = false;
    cout << por_boodan << khali_boodan;
}
        `;
        return await TestBase.testFullCode(testCode, `10`, {isCpp: true});
    });

    it('uses true and false in expressions', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main()
{
    cout << !false << (true && false) << (true || false) << (true ? 7 : 8) << endl;
    if (true) {
        cout << "yes" << endl;
    }
    if (false) {
        cout << "no" << endl;
    }
}
        `;
        return await TestBase.testFullCode(testCode, `1017\nyes`, {isCpp: true});
    });

    it('initializes a global bool with a boolean literal', async function () {
        const testCode = `
#include <iostream>
using namespace std;

bool enabled = true;
bool disabled = false;

int main()
{
    cout << enabled << disabled;
}
        `;
        return await TestBase.testFullCode(testCode, `10`, {isCpp: true});
    });

    it('passes boolean literals to functions taking bool', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int toInt(bool value) {
    return value;
}

int main()
{
    cout << toInt(true) << toInt(false);
}
        `;
        return await TestBase.testFullCode(testCode, `10`, {isCpp: true});
    });

    it('still allows identifiers that merely start with true/false', async function () {
        const testCode = `
#include <iostream>
using namespace std;

int main()
{
    int trueCount = 3;
    int falsehood = 4;
    cout << trueCount << falsehood;
}
        `;
        return await TestBase.testFullCode(testCode, `34`, {isCpp: true});
    });
});
