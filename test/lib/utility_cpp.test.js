const TestBase = require('../integration/testbase');

describe('std::utility', function () {
    it('swaps values and fixed-size int arrays', async function() {
        const testCode = `
#include <iostream>
#include <utility>
using namespace std;

int main() {
    int left = 3;
    int right = 9;
    swap(left, right);
    cout << left << " " << right << " ";

    int a[4];
    int b[4] = {10, 20, 30, 40};
    swap(a, b);

    cout << "a contains:";
    for (int i = 0; i < 4; i++) {
        cout << a[i] << " ";
    }
    return 0;
}
        `;
        const expectOutput = `9 3 a contains:10 20 30 40`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('constructs pairs with make_pair', async function() {
        const testCode = `
#include <iostream>
#include <utility>
using namespace std;

int main() {
    pair<int, int> a;
    pair<double, char> b;

    a = make_pair(10, 20);
    b = make_pair(15.5, 'B');

    cout << "a: " << a.first << ", " << a.second << endl;
    cout << "b: " << b.first << ", " << b.second << endl;
    return 0;
}
        `;
        const expectOutput = `a: 10, 20\nb: 15.5, B\n`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('compares pairs lexicographically', async function() {
        const testCode = `
#include <iostream>
using namespace std;

int main(){
    pair<int, int> p1 = {3, 5};
    pair<int, int> p2 = {3, 7};
    pair<int, int> p3 = {2, 5};

    cout << "p1 == p2: " << (p1 == p2) << endl;
    cout << "p1 != p3: " << (p1 != p3) << endl;
    cout << "p1 > p3: " << (p1 > p3) << endl;
    cout << "p1 < p2: " << (p1 < p2) << endl;
    cout << "p1 >= p3: " << (p1 >= p3) << endl;
    cout << "p3 <= p1: " << (p3 <= p1);
    return 0;
}
        `;
        const expectOutput = `p1 == p2: 0
p1 != p3: 1
p1 > p3: 1
p1 < p2: 1
p1 >= p3: 1
p3 <= p1: 1`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('list-initializes pairs with constructible class elements', async function() {
        const testCode = `
#include <iostream>
#include <utility>
using namespace std;

int main(){
    pair<int, string> p1 = {1, "Geeks"};
    cout << p1.first << " : " << p1.second;
    return 0;
}
        `;
        const expectOutput = `1 : Geeks`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('default-constructs pair members before assignment', async function() {
        const testCode = `
#include <iostream>
#include <utility>
using namespace std;

int main(){
    pair<int, string> p3;
    p3.first = 3;
    p3.second = "Cherry";
    cout << p3.first << " " << p3.second << endl;
    return 0;
}
        `;
        const expectOutput = `3 Cherry\n`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports pair structured bindings', async function() {
        const testCode = `
#include <iostream>
#include <utility>
using namespace std;

int main(){
    pair<int, string> myPair = {1, "Geeks"};
    auto [number, text] = myPair;
    cout << "Number: " << number << "\\n";
    cout << "Text: " << text << "\\n";
    return 0;
}
        `;
        const expectOutput = `Number: 1\nText: Geeks\n`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('assigns pairs from braced initializer lists', async function() {
        const testCode = `
#include <bits/stdc++.h>
using namespace std;

pair<int, int> findMinDiff(vector<int>& v) {
    sort(v.begin(), v.end());
    int minDiff = INT_MAX;
    pair<int, int> res;
    for (auto i = 0; i < v.size() - 1; i++) {
        int diff = v[i + 1] - v[i];
        if (diff < minDiff) {
            minDiff = diff;
            res = {v[i], v[i + 1]};
        }
    }

    return res;
}

int main() {
    vector<int> v = {4, 2, 9, 7, 1, 5};
    pair<int, int> res = findMinDiff(v);
    cout << res.first << ", " << res.second;
    return 0;
}
        `;
        const expectOutput = `1, 2`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports move and move_if_noexcept as utility casts', async function() {
        const testCode = `
#include <iostream>
#include <utility>
using namespace std;

int main() {
    int source = 42;
    int moved = move(source);
    int fallback = move_if_noexcept(moved);
    cout << moved << " " << fallback;
    return 0;
}
        `;
        const expectOutput = `42 42`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('moves ranges through algorithm move', async function() {
        const testCode = `
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> values = {1, 2, 3, 4, 5};
    vector<int> moved(5);

    move(values.begin(), values.end(), moved.begin());

    cout << "values contains " << values.size() << " elements ";
    cout << "moved contains:";
    for (int i = 0; i < moved.size(); i++) {
        cout << moved[i] << " ";
    }
    return 0;
}
        `;
        const expectOutput = `values contains 5 elements moved contains:1 2 3 4 5`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });
});
