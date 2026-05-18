const TestBase = require('../integration/testbase');

describe('std::deque', function () {
    it('supports initializer lists and range-for', async function() {
        const testCode = `
#include <deque>
#include <iostream>
using namespace std;

int main()
{
    deque<int> d1;
    deque<int> d2 = {10, 20, 30, 40};
    for (int val : d2) {
        cout << val << " ";
    }
    cout << endl;
    return 0;
}
        `;
        const expectOutput = `10 20 30 40 \n`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports front and back operations', async function() {
        const testCode = `
#include <deque>
#include <iostream>
using namespace std;

int main()
{
    deque<int> d;
    d.push_back(2);
    d.push_back(3);
    d.push_front(1);
    cout << d.front() << " " << d.back() << " " << d.size() << endl;
    d.pop_front();
    d.pop_back();
    cout << d.front() << " " << d.size();
    return 0;
}
        `;
        const expectOutput = `1 3 3\n2 1`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });
});
