#ifndef _CPP_BITS_STDCXX_H
#define _CPP_BITS_STDCXX_H

#include <algorithm>
#include <deque>
#include <iostream>
#include <limits.h>
#include <map>
#include <numeric>
#include <queue>
#include <set>
#include <stack>
#include <stdlib.h>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

__libcall double sqrt(double);

#ifndef _CPP_INT_SQRT_OVERLOAD
#define _CPP_INT_SQRT_OVERLOAD
int sqrt(int value) {
    return (int) sqrt((double) value);
}
#endif

#endif
