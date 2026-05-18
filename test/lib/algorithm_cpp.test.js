const TestBase = require('../integration/testbase');

describe('std::algorithm', function () {
    it('supports common pointer-range algorithms', async function() {
        const testCode = `
#include <iostream>
#include <algorithm>
using namespace std;

int main(){
    int values[5] = {4, 1, 3, 1, 2};
    sort(values, values + 5);
    cout << values[0] << values[1] << values[2] << values[3] << values[4] << " ";
    cout << count(values, values + 5, 1) << " ";
    int *found = find(values, values + 5, 3);
    cout << *found << " ";
    reverse(values, values + 5);
    cout << values[0] << " " << min(7, 2) << " " << max(7, 2);
}
        `;
        const expectOutput = `11234 2 3 4 2 7`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('sorts vector ranges with begin and end', async function() {
        const testCode = `
#include <algorithm>
#include <iostream>
#include <vector>

using namespace std;

int main() {
    vector<int> v = {5, 3, 1, 4, 2};

    sort(v.begin(), v.end());

    for (int i : v) cout << i << " ";
    return 0;
}
        `;
        const expectOutput = `1 2 3 4 5`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports unique with vector iterators', async function() {
        const testCode = `
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main()
{
    vector<int> v = { 1, 1, 3, 3, 3, 10, 1, 3, 3, 7, 7, 8 };

    vector<int>::iterator ip;
    ip = std::unique(v.begin(), v.begin() + 12);
    v.resize(std::distance(v.begin(), ip));

    for (ip = v.begin(); ip != v.end(); ++ip) {
        cout << *ip << " ";
    }

    return 0;
}
        `;
        const expectOutput = `1 3 10 1 3 7 8`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports distance from arrays to found iterators', async function() {
        const testCode = `
#include <bits/stdc++.h>
using namespace std;

int main() {
    int arr[5] = {1, 3, 6, 2, 9};
    auto it = find(arr, arr + 5, 6);
    cout << distance(arr, it);
    return 0;
}
        `;
        const expectOutput = `2`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports replace over pointer ranges', async function() {
        const testCode = `
#include <bits/stdc++.h>
using namespace std;

int main()
{
    int arr[] = { 10, 20, 30, 30, 20, 10, 10, 20 };
    int n = sizeof(arr) / sizeof(arr[0]);
    int old_val = 20, new_val = 99;
    cout << "Original Array:";
    for (int i = 0; i < n; i++)
        cout << ' ' << arr[i];
    cout << '\\n';
    replace(arr, arr + n, old_val, new_val);
    cout << "New Array:";
    for (int i = 0; i < n; i++)
        cout << ' ' << arr[i];
    cout << '\\n';

    return 0;
}
        `;
        const expectOutput = `Original Array: 10 20 30 30 20 10 10 20\nNew Array: 10 99 30 30 99 10 10 99\n`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports replace_if over pointer ranges', async function() {
        const testCode = `
#include <bits/stdc++.h>
using namespace std;

bool IsOdd(int i)
{
  return ((i % 2) == 1);
}

int main()
{
    int arr[] = { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };
    int n = sizeof(arr) / sizeof(arr[0]);
    cout << "Original Array:";
    for (int i = 0; i < n; i++)
        cout << ' ' << arr[i];
    cout << '\\n';
    int new_val = 0;
    replace_if(arr, arr + n, IsOdd, new_val);
    cout << "New Array:";
    for (int i = 0; i < n; i++)
        cout << ' ' << arr[i];
    cout << '\\n';
    return 0;
}
        `;
        const expectOutput = `Original Array: 1 2 3 4 5 6 7 8 9 10\nNew Array: 0 2 0 4 0 6 0 8 0 10\n`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports lower_bound and upper_bound with auto iterators', async function() {
        const testCode = `
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> v = {10, 20, 30, 40, 50};

    auto lower = lower_bound(v.begin(), v.end(), 30);
    auto upper = upper_bound(v.begin(), v.end(), 30);

    cout << *lower << " " << *upper;
    return 0;
}
        `;
        const expectOutput = `30 40`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports min and max over initializer lists', async function() {
        const testCode = `
#include<bits/stdc++.h>

using namespace std;

int main() {
  cout << min({1, 2, 3, 4, 5, 10, -1, 7}) << " ";
  cout << max({1, 2, 3, 4, 5, 10, -1, 7});
  return 0;
}
        `;
        const expectOutput = `-1 10`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports min with a comparator for class values', async function() {
        const testCode = `
#include <bits/stdc++.h>
using namespace std;

class St {
  public:
  int sno;
  string name;
  St(int val, string s): sno(val), name(s) {}
};

bool comp(const St& a, const St& b) {
  return a.sno < b.sno;
}

int main() {
    St a(8, "Divesh");
    St b(91, "Rohan");
    auto smaller = min(a, b, comp);
    cout << smaller.sno << " " << smaller.name;
    return 0;
}
        `;
        const expectOutput = `8 Divesh`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports binary_search over sorted pointer ranges', async function() {
        const testCode = `
#include <bits/stdc++.h>
using namespace std;

int main() {
    int arr[] = {1, 4, 5, 7, 9};
    int n = sizeof(arr) / sizeof(arr[0]);
    int k = 7;
    if (binary_search(arr, arr + n, k))
        cout << k << " is Present";
    else
        cout << k << " is NOT Present";
    return 0;
}
        `;
        const expectOutput = `7 is Present`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports lexicographical_compare with a lambda comparator', async function() {
        const testCode = `
#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

bool comp(const string &a, const string &b)
{
    return lexicographical_compare(a.begin(), a.end(), b.begin(), b.end(),
                                   [](char c1, char c2) { return tolower(c1) < tolower(c2); });
}

int main()
{
    vector<string> v = {"Apple", "banana", "Cherry", "date", "Elderberry"};
    auto lb = lower_bound(v.begin(), v.end(), "Avocado", comp);
    if (lb != v.end())
        cout << *lb;
    else
        cout << "Lower bound not found!";
    return 0;
}
        `;
        const expectOutput = `banana`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports max_element with vector iterators', async function() {
        const testCode = `
#include <bits/stdc++.h>
using namespace std;

void countingSort(vector<int>& v) {
    int m = *max_element(v.begin(), v.end());
    vector<int> count(m + 1, 0);
    for (int i : v) {
        count[i]++;
    }

    int index = 0;
    for (int i = 0; i <= m; i++) {
        while (count[i] > 0) {
            v[index++] = i;
            count[i]--;
        }
    }
}

int main() {
    vector<int> v = {5, 3, 1, 4, 2};
    countingSort(v);
    for (int i : v) cout << i << " ";
    return 0;
}
        `;
        const expectOutput = `1 2 3 4 5`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });

    it('supports unique results erased from vectors', async function() {
        const testCode = `
#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> v = { 1, 3, 1, 1, 2, 3, 2, 4, 5 };
    sort(v.begin(), v.end());
    auto it = unique(v.begin(), v.end());
    v.erase(it, v.end());
    for (auto& i : v) cout << i << " ";
    return 0;
}
        `;
        const expectOutput = `1 2 3 4 5`;
        return await TestBase.testFullCode(testCode, expectOutput, {isCpp: true});
    });
});
