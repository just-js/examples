#include <stdlib.h>
#include <stdio.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>
int main(int argc, char *argv[]) {
  char buf[65536];
  int size = 0;
  int n = 0;
  while (n = read(0, buf, 65536)) size += n;
  if (n < 0) {
    fprintf(stderr, "read: %s (%i)\n", strerror(errno), errno);
    exit(1);
  }
  fprintf(stdout, "size: %i\n", size);
}
