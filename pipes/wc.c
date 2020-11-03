#include <stdlib.h>
#include <stdio.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>

#define BUFSIZE 65536

int main(int argc, char *argv[]) {
  char buf[BUFSIZE];
  unsigned long size = 0;
  int n = 0;
  while (n = read(STDIN_FILENO, buf, BUFSIZE)) size += n;
  if (n < 0) {
    fprintf(stderr, "read: %s (%i)\n", strerror(errno), errno);
    exit(1);
  }
  fprintf(stdout, "size: %lu\n", size);
}
