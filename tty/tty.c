#define _XOPEN_SOURCE

#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <stdlib.h>
#include <pthread.h>
#include <termios.h>
#include <stdio.h>
#include <unistd.h>

#define BUFFER_SIZE 128
#define BAUDRATE    B9600

void* reader_thread(void* pointer) {
    int fd = (int)pointer;
    char inputbyte;
    while (read(fd, &inputbyte, 1) == 1) {
        write(STDOUT_FILENO, &inputbyte, 1);
    }

    return 0;
}

int main(int argc, char** argv) {
    if (argc < 2) return 1;

    int fd = 0;
    char* mode = argv[1];

    if (strncmp(mode, "slave", 5) == 0) {
        if (argc < 3) return 1;

        fd = open(argv[2], O_RDWR);
        if (fd == -1) {
            fprintf(stderr, "error opening file\n");
            return -1;
        }

    }else if (strncmp(mode, "master", 6) == 0) {
        fd = open("/dev/ptmx", O_RDWR | O_NOCTTY);
        if (fd == -1) {
            fprintf(stderr, "error opening file\n");
            return -1;
        }

        grantpt(fd);
        unlockpt(fd);

        char* pts_name = calloc(1, 256);
        int r = ptsname_r(fd, pts_name, 256);
        fprintf(stderr, "ptsname: %s\n", pts_name);
    } else {
        return 1;
    }

    /* serial port parameters */
    struct termios newtio;
    memset(&newtio, 0, sizeof(newtio));
    struct termios oldtio;
    tcgetattr(fd, &oldtio);

    newtio = oldtio;
    newtio.c_cflag = BAUDRATE | CS8 | CLOCAL | CREAD;
    newtio.c_iflag = 0;
    newtio.c_oflag = 0;
    newtio.c_lflag = 0;
    newtio.c_cc[VMIN] = 1;
    newtio.c_cc[VTIME] = 0;
    tcflush(fd, TCIFLUSH);

    cfsetispeed(&newtio, BAUDRATE);
    cfsetospeed(&newtio, BAUDRATE);
    tcsetattr(fd, TCSANOW, &newtio);

    /* start reader thread */
    pthread_t thread;
    pthread_create(&thread, 0, reader_thread, (void*) fd);

    fprintf(stderr, "%u %u %u %u\n", 0000001, 0000010, 0000017, 0b01);
    /* read from stdin and send it to the serial port */
    char c;
    while (1) {
        read(STDIN_FILENO, &c, 1);
        write(fd, &c, 1);
    }

    close(fd);
    return 0;
}