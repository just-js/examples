#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

static int counter;

uint32_t fib(uint32_t n) {
  if (n <= 1) return 1;
  return fib(n - 1) + fib(n - 2);
}

int main(int argc, char** argv) {
  int run = 10000;
  int seed = 24;
  if (argc > 1) {
    seed = atoi(argv[1]);
  }
  if (argc > 2) {
    run = atoi(argv[2]);
  }
  while (run--) {
    counter += fib(seed);
  }
  if (counter == 100) {
    fprintf(stderr, "hello\n");
  }
  return 0;
}
