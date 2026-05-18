const TestBase = require('../integration/testbase');

describe('std::set', function () {
    it('supports initializer lists and sorted unique iteration', async function() {
        const testCode = `
#include <iostream>
#include <set>
using namespace std;

int main() {
    set<int> values = {4, 1, 5, 1, 3};
    cout << values.size() << ":";
    for (auto it = values.begin(); it != values.end(); ++it) {
        cout << " " << *it;
    }
    return 0;
}
        `;
        const expectOutput = `4: 1 3 4 5`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('works with binary_search through bits/stdc++.h', async function() {
        const testCode = `
#include <bits/stdc++.h>
using namespace std;

int main() {
    set<int> s = {1, 4, 5, 7, 9};
    int k = 8;
    if (binary_search(s.begin(), s.end(), k))
        cout << k << " is Present";
    else
        cout << k << " is NOT Present";
    return 0;
}
        `;
        const expectOutput = `8 is NOT Present`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('erases by key and iterator', async function() {
        const testCode = `
#include <iostream>
#include <set>
using namespace std;

int main() {
    set<int> s = {1, 2, 3, 4};
    s.erase(2);
    auto next = s.erase(s.begin());
    cout << *next << endl;
    for (auto i : s)
        cout << i << " ";
    cout << endl;

    return 0;
}
        `;
        const expectOutput = `3\n3 4 \n`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });
});
