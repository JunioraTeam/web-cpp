const TestBase = require('../integration/testbase');

describe('stdlib', function () {
    it('supports abs through bits/stdc++.h', async function() {
        const testCode = `
#include <bits/stdc++.h>

using namespace std;

int main()
{
    cout << "Value Of INT_MIN is : " << INT_MIN << endl;
    cout << "Value Of abs(INT_MIN) is : " << abs(INT_MIN)
         << endl;
    return 0;
}
        `;
        const expectOutput = `Value Of INT_MIN is : -2147483648
Value Of abs(INT_MIN) is : -2147483648
`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });
});
