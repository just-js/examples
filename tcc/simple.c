#include <stdio.h>
#include <unistd.h>

extern char **environ;

int main (int argc, char** argv) {
  //return (void*)just::blake3::Init;
  int size = 0;
  fprintf(stderr, "environ %lu\n", sizeof(**environ));
  while (environ[size]) size++;
  for (int i = 0; i < size; ++i) {
    const char *var = environ[i];
    fprintf(stderr, "%s\n", var);
  }
  return 0;
}
