const TestBase = require('../integration/testbase');

describe('std::unordered_map', function () {
    it('supports initializer lists and range-based traversal', async function() {
        const testCode = `
#include <iostream>
#include <unordered_map>
using namespace std;

int main() {
    unordered_map<int, string> um =
    {{1, "Geeks"}, {2, "For"}, {3, "C++"}};

    for (auto i : um)
        cout << i.first << ": " << i.second << endl;
    return 0;
}
        `;
        const expectOutput = `1: Geeks\n2: For\n3: C++\n`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports insertion with operator brackets and insert', async function() {
        const testCode = `
#include <bits/stdc++.h>
using namespace std;

int main() {
    unordered_map<int, string> um;

    um[1] = "Geeks";
    um.insert({2, "For"});
    um.insert({3, "C++"});

    for (auto it = um.begin(); it != um.end(); it++)
        cout << it->first << ": " << it->second << endl;
    return 0;
}
        `;
        const expectOutput = `3: C++\n2: For\n1: Geeks\n`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports access and update with brackets and at', async function() {
        const testCode = `
#include <bits/stdc++.h>
using namespace std;

int main() {
    unordered_map<int, string> um =
    {{1, "Geeks"}, {2, "For"}, {3, "C++"}};

    cout << um[2] << endl;
    cout << um.at(1) << endl;

    um[2] = "By";
    um.at(1) = "Tips";
    cout << um[2] << endl;
    cout << um.at(1);
    return 0;
}
        `;
        const expectOutput = `For\nGeeks\nBy\nTips`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports find, erase, size, empty, and clear', async function() {
        const testCode = `
#include <bits/stdc++.h>
using namespace std;

int main() {
    unordered_map<int, string> um =
    {{1, "Geeks"}, {2, "For"}, {3, "C++"}};

    auto it = um.find(2);
    if (it != um.end())
        cout << it->first << ": " << it->second << endl;
    else
        cout << "Not Found" << endl;

    um.erase(2);
    um.erase(um.begin());
    cout << "size: " << um.size() << " empty: " << um.empty() << endl;
    for (auto i : um)
        cout << i.first << ": " << i.second << endl;
    um.clear();
    cout << "size: " << um.size() << " empty: " << um.empty();
    return 0;
}
        `;
        const expectOutput = `2: For\nsize: 1 empty: 0\n3: C++\nsize: 0 empty: 1`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });
});
