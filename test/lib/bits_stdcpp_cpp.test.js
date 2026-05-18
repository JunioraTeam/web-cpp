const TestBase = require('../integration/testbase');

describe('bits/stdc++.h', function () {
    it('includes the supported C++ standard headers', async function() {
        const testCode = `
#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> values = {5, 3, 1, 4, 2};
    sort(values.begin(), values.end());
    int total = accumulate(values.begin(), values.end(), 0);

    deque<int> items;
    items.push_back(values.front());
    items.push_back(total);

    pair<int, int> bounds = make_pair(values[0], values[4]);

    cout << bounds.first << " " << bounds.second << " " << items.front() << " " << items.back();
    return 0;
}
        `;
        const expectOutput = `1 5 1 15`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('includes math functions', async function() {
        const testCode = `
#include <bits/stdc++.h>
using namespace std;

int main() {
    cout << sqrt(25);
    return 0;
}
        `;
        const expectOutput = `5`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });
});
