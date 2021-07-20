#ifndef JUST_SIGNAL_H
#define JUST_SIGNAL_H

#include <just.h>

#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/epoll.h>
#include <unistd.h>
#include <inttypes.h>
#include <stdarg.h>

namespace just {

namespace memory {

struct rawBuffer {
  void* data;
  size_t len;
};

std::map<int, rawBuffer*> buffers;
static int bcount = 0;

void ReadString(const FunctionCallbackInfo<Value> &args);
void WriteString(const FunctionCallbackInfo<Value> &args);
void WriteCString(const FunctionCallbackInfo<Value> &args);
void WritePointer(const FunctionCallbackInfo<Value> &args);
void GetAddress(const FunctionCallbackInfo<Value> &args);
void ReadMemory(const FunctionCallbackInfo<Value> &args);
void RawBuffer(const FunctionCallbackInfo<Value> &args);
void Alloc(const FunctionCallbackInfo<Value> &args);
void Copy(const FunctionCallbackInfo<Value> &args);
void GetMeta(const FunctionCallbackInfo<Value> &args);
void MemFdCreate(const FunctionCallbackInfo<Value> &args);

void Init(Isolate* isolate, Local<ObjectTemplate> target);
}

}

extern "C" {
	void* _register_memory() {
		return (void*)just::memory::Init;
	}
}

#endif
