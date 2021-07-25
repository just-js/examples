#include <x86intrin.h>
#include <stdint.h>
#include <stdio.h>
#include <unistd.h>

uint64_t cycles() {
  return __rdtsc();
}

int main(int argc, char** argv) {
  while (1) {
    fprintf(stderr, "cycles %lu\n", cycles());
    //sleep(1);
  }
  return 0;
}
