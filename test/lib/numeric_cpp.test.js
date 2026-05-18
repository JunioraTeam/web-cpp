const TestBase = require('../integration/testbase');

describe('std::numeric', function () {
    it('supports accumulate over vector iterators', async function() {
        const testCode = `
#include <iostream>
#include <vector>
#include <numeric>
using namespace std;

int main() {
    vector<int> vec = {5, 10, 15};
    int sum = accumulate(vec.begin(), vec.end(), 0);
    cout << sum << endl;
    return 0;
}
        `;
        const expectOutput = `30\n`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports partial_sum over vector iterators', async function() {
        const testCode = `
#include <iostream>
#include <vector>
#include <numeric>
using namespace std;

int main() {
    vector<int> vec = {5, 10, 15};
    vector<int> res(vec.size());
    partial_sum(vec.begin(), vec.end(), res.begin());
    for (int val : res)
        cout << val << " ";
    return 0;
}
        `;
        const expectOutput = `5 15 30`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports accumulate with a binary operation', async function() {
        const testCode = `
#include <iostream>
#include <vector>
#include <numeric>
using namespace std;

int multiply(int a, int b) {
    return a * b;
}

int main() {
    vector<int> vec = {5, 10, 15};
    int product = accumulate(vec.begin(), vec.end(), 1, multiply);
    cout << product << endl;
    return 0;
}
        `;
        const expectOutput = `750\n`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports partial_sum with a binary operation', async function() {
        const testCode = `
#include <iostream>
#include <vector>
#include <numeric>
using namespace std;

int multiply(int a, int b) {
    return a * b;
}

int main() {
    vector<int> vec = {5, 10, 15};
    vector<int> res(vec.size());
    partial_sum(vec.begin(), vec.end(), res.begin(), multiply);
    for (int val : res)
        cout << val << " ";
    return 0;
}
        `;
        const expectOutput = `5 50 750`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });
});
