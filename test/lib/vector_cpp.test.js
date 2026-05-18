const TestBase = require('../integration/testbase');

describe('std::vector', function () {
    it('supports dynamic storage and element access', async function() {
        const testCode = `
#include <iostream>
#include <vector>
using namespace std;

int main(){
    vector<int> values;
    for (int i = 0; i < 6; i++){
        values.push_back(i * 2);
    }
    values[1] = 9;
    cout << values.size() << " " << values.front() << " " << values[1] << " " << values.back();
    values.pop_back();
    cout << " " << values.size() << " " << values.back();
}
        `;
        const expectOutput = `6 0 9 10 5 8`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports fill construction, initializer lists, and range-for', async function() {
        const testCode = `
#include <iostream>
#include <vector>
using namespace std;
int main() {
    vector<int> v1;
    vector<int> v2(3, 5);
    for (int x : v2) {
        cout << x << " ";
    }
    cout << endl;
    vector<int> v3 = {1, 2, 3};
    for (int x : v3) {
        cout << x << " ";
    }
    return 0;
}
        `;
        const expectOutput = `5 5 5 \n1 2 3`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports nested initializer lists', async function() {
        const testCode = `
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<vector<int>> v = {
        {1, 2, 3},
        {4, 5, 6},
        {7, 8, 9}
    };
    for (int i = 0; i < v.size(); i++) {
        for (int j = 0; j < v[i].size(); j++) {
            cout << v[i][j] << " ";
        }
        cout << endl;
    }
    return 0;
}
        `;
        const expectOutput = `1 2 3 \n4 5 6 \n7 8 9`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports arbitrary-length initializer lists', async function() {
        const testCode = `
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> values = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14};
    cout << values.size() << " " << values.front() << " " << values.back();
    return 0;
}
        `;
        const expectOutput = `14 1 14`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('inserts elements at iterator positions', async function() {
        const testCode = `
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main()
{
    vector<int> v = {10, 20, 30, 40, 50};
    int val = 35;
    auto lb = lower_bound(v.begin(), v.end(), val);
    auto inserted = v.insert(lb, val);
    cout << *inserted << endl;
    v.insert(v.end(), 60);
    for (auto i : v)
        cout << i << " ";

    return 0;
}
        `;
        const expectOutput = `35\n10 20 30 35 40 50 60 `;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('inserts class elements at iterator positions', async function() {
        const testCode = `
#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<string> values = {"alpha", "charlie"};
    string beta = "bravo";
    values.insert(values.begin() + 1, beta);
    for (auto value : values) {
        cout << value << " ";
    }
    return 0;
}
        `;
        const expectOutput = `alpha bravo charlie `;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });
});
