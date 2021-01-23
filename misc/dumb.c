#include <assert.h>
#include <errno.h>
#include <getopt.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

#define MAXSIG 31
char signal_temporary_ignores[MAXSIG + 1] = {[0 ... MAXSIG] = 0};
pid_t child_pid = -1;

void handle_signal(int signum) {
  fprintf(stderr, "signal %i\n", signum);
  if (signal_temporary_ignores[signum] == 1) {
    signal_temporary_ignores[signum] = 0;
  } else if (signum == SIGCHLD) {
    int status, exit_status;
    pid_t killed_pid;
    while ((killed_pid = waitpid(-1, &status, WNOHANG)) > 0) {
      if (WIFEXITED(status)) {
        exit_status = WEXITSTATUS(status);
      } else {
        assert(WIFSIGNALED(status));
        exit_status = 128 + WTERMSIG(status);
      }
      if (killed_pid == child_pid) {
        kill(-child_pid, SIGTERM);
        exit(exit_status);
      }
    }
  } else {
    if (signum != 0) kill(-child_pid, signum);
    if (signum == SIGTSTP || signum == SIGTTOU || signum == SIGTTIN) {
      kill(getpid(), SIGSTOP);
    }
  }
}

void dummy(int signum) {}

int dumb (int argc, char * argv[]) {
  sigset_t all_signals;
  sigfillset(&all_signals);
  sigprocmask(SIG_BLOCK, &all_signals, NULL);
  int i = 0;
  for (i = 1; i <= MAXSIG; i++) {
    signal(i, dummy);
  }
  if (ioctl(STDIN_FILENO, TIOCNOTTY) != -1) {
    if (getsid(0) == getpid()) {
      signal_temporary_ignores[SIGHUP] = 1;
      signal_temporary_ignores[SIGCONT] = 1;
    }
  }
  child_pid = fork();
  if (child_pid < 0) {
    return 1;
  } else if (child_pid == 0) {
    /* child */
    sigprocmask(SIG_UNBLOCK, &all_signals, NULL);
    if (setsid() == -1) {
      exit(1);
    }
    ioctl(STDIN_FILENO, TIOCSCTTY, 0);
    execvp("/usr/local/bin/just", &argv[0]);
    return 2;
  } else {
    /* parent */
    if (chdir("/") == -1) {}
    for (;;) {
      int signum;
      sigwait(&all_signals, &signum);
      handle_signal(signum);
    }
  }
}

int main(int argc, char *argv[]) {
  return dumb(argc, argv);
}