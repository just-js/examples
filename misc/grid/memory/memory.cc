#include "memory.h"

void just::memory::ReadMemory(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  Local<BigInt> start64 = Local<BigInt>::Cast(args[0]);
  Local<BigInt> end64 = Local<BigInt>::Cast(args[1]);
  const uint64_t size = end64->Uint64Value() - start64->Uint64Value();
  void* start = reinterpret_cast<void*>(start64->Uint64Value());
  // this memory is just wrapped by an arraybuffer and will not be freed by v8
  // we also don't give it a callback to just::FreeMemory so it will never be freed
  std::unique_ptr<BackingStore> backing = ArrayBuffer::NewBackingStore(
      start, size, [](void*, size_t, void*){}, nullptr);
  Local<ArrayBuffer> ab = ArrayBuffer::New(isolate, std::move(backing));
  args.GetReturnValue().Set(ab);
}

void just::memory::GetMeta(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  Local<Context> context = isolate->GetCurrentContext();
  Local<Object> meta = args[1].As<Object>();
  bool isExternal = false;
  bool isDetachable = false;
  bool isShared = false;
  if (args[0]->IsArrayBuffer()) {
    Local<ArrayBuffer> buf = args[0].As<ArrayBuffer>();
    isExternal = buf->IsExternal();
    isDetachable = buf->IsDetachable();
  } else if (args[0]->IsSharedArrayBuffer()) {
    Local<SharedArrayBuffer> buf = args[0].As<SharedArrayBuffer>();
    isExternal = buf->IsExternal();
    isShared = true;
  }
  meta->Set(context, String::NewFromUtf8Literal(isolate, "isExternal", NewStringType::kInternalized), v8::Boolean::New(isolate, isExternal)).Check();
  meta->Set(context, String::NewFromUtf8Literal(isolate, "isDetachable", NewStringType::kInternalized), v8::Boolean::New(isolate, isDetachable)).Check();
  meta->Set(context, String::NewFromUtf8Literal(isolate, "isShared", NewStringType::kInternalized), v8::Boolean::New(isolate, isShared)).Check();
  args.GetReturnValue().Set(meta);
}

void just::memory::RawBuffer(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  Local<ArrayBuffer> ab = args[0].As<ArrayBuffer>();
  std::shared_ptr<BackingStore> backing = ab->GetBackingStore();
  just::memory::rawBuffer* buf = new just::memory::rawBuffer();
  buf->data = backing->Data();
  buf->len = backing->ByteLength();
  just::memory::buffers[just::memory::bcount] = buf;
  args.GetReturnValue().Set(Integer::New(isolate, just::memory::bcount++));
}

void just::memory::Alloc(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  Local<Context> context = isolate->GetCurrentContext();
  int size = Local<Integer>::Cast(args[0])->Value();
  Local<ArrayBuffer> ab = ArrayBuffer::New(isolate, size);
  just::memory::rawBuffer* buf = new just::memory::rawBuffer();
  buf->data = ab->GetBackingStore()->Data();
  buf->len = size;
  just::memory::buffers[just::memory::bcount] = buf;
  ab->Set(context, String::NewFromUtf8Literal(isolate, "raw", NewStringType::kInternalized), Integer::New(isolate, just::memory::bcount++)).Check();
  args.GetReturnValue().Set(ab);
}

void just::memory::WriteString(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  just::memory::rawBuffer* b = just::memory::buffers[Local<Integer>::Cast(args[0])->Value()];
  Local<String> str = args[1].As<String>();
  int len = str->Utf8Length(isolate);
  int nchars = 0;
  int off = 0;
  if (args.Length() > 2) {
    off = Local<Integer>::Cast(args[2])->Value();
  }
  char* dest = (char*)b->data + off;
  args.GetReturnValue().Set(Integer::New(isolate, str->WriteUtf8(isolate, dest, len, &nchars, v8::String::HINT_MANY_WRITES_EXPECTED | v8::String::NO_NULL_TERMINATION)));
}

void just::memory::WriteCString(const FunctionCallbackInfo<Value> &args) {
  Isolate *isolate = args.GetIsolate();
  just::memory::rawBuffer* b = just::memory::buffers[Local<Integer>::Cast(args[0])->Value()];
  Local<String> str = args[1].As<String>();
  int len = str->Length();
  int off = 0;
  if (args.Length() > 2) off = Local<Integer>::Cast(args[2])->Value();
  args.GetReturnValue().Set(Integer::New(isolate, str->WriteOneByte(isolate, (uint8_t*)b->data, off, len, v8::String::HINT_MANY_WRITES_EXPECTED)));
}

void just::memory::WritePointer(const FunctionCallbackInfo<Value> &args) {
  just::memory::rawBuffer* dest = just::memory::buffers[Local<Integer>::Cast(args[0])->Value()];
  int off = Local<Integer>::Cast(args[1])->Value();
  just::memory::rawBuffer* src = just::memory::buffers[Local<Integer>::Cast(args[2])->Value()];
  char* ptr = (char*)dest->data + off;
  *reinterpret_cast<void **>(ptr) = src->data;
}

void just::memory::ReadString(const FunctionCallbackInfo<Value> &args) {
  just::memory::rawBuffer* b = just::memory::buffers[Local<Integer>::Cast(args[0])->Value()];
  int len = b->len;
  int argc = args.Length();
  if (argc > 1) {
    len = Local<Integer>::Cast(args[1])->Value();
  }
  int off = 0;
  if (argc > 2) {
    off = Local<Integer>::Cast(args[2])->Value();
  }
  const char* src = (const char*)b->data + off;
  args.GetReturnValue().Set(String::NewFromUtf8(args.GetIsolate(), src, 
    NewStringType::kNormal, len).ToLocalChecked());
}

void just::memory::Copy(const FunctionCallbackInfo<Value> &args) {
  just::memory::rawBuffer* dest = just::memory::buffers[Local<Integer>::Cast(args[0])->Value()];
  just::memory::rawBuffer* src = just::memory::buffers[Local<Integer>::Cast(args[1])->Value()];
  int argc = args.Length();
  int doff = 0;
  if (argc > 2) {
    doff = Local<Integer>::Cast(args[2])->Value();
  }
  int len = src->len;
  if (argc > 3) {
    len = Local<Integer>::Cast(args[3])->Value();
  }
  int soff = 0;
  if (argc > 4) {
    soff = Local<Integer>::Cast(args[4])->Value();
  }
  char* d = (char*)dest->data + doff;
  const char* s = (const char*)src->data + soff;
  memcpy(d, s, len);
  args.GetReturnValue().Set(Integer::New(args.GetIsolate(), len));
}

void just::memory::GetAddress(const FunctionCallbackInfo<Value> &args) {
  just::memory::rawBuffer* b = just::memory::buffers[Local<Integer>::Cast(args[0])->Value()];
  args.GetReturnValue().Set(BigInt::New(args.GetIsolate(), (uint64_t)b->data));
}

void just::memory::MemFdCreate(const FunctionCallbackInfo<Value> &args) {
  Isolate* isolate = args.GetIsolate();
  v8::String::Utf8Value fname(isolate, args[0]);
  int flags = Local<Integer>::Cast(args[1])->Value();
  args.GetReturnValue().Set(Integer::New(isolate, memfd_create(*fname, flags)));
}

void just::memory::Init(Isolate* isolate, Local<ObjectTemplate> target) {
  Local<ObjectTemplate> module = ObjectTemplate::New(isolate);

  SET_METHOD(isolate, module, "rawBuffer", RawBuffer);

  SET_METHOD(isolate, module, "readString", ReadString);
  SET_METHOD(isolate, module, "writeString", WriteString);
  SET_METHOD(isolate, module, "writeCString", WriteCString);

  SET_METHOD(isolate, module, "getAddress", GetAddress);
  SET_METHOD(isolate, module, "writePointer", WritePointer);
  SET_METHOD(isolate, module, "readMemory", ReadMemory);
  SET_METHOD(isolate, module, "getMeta", GetMeta);
  SET_METHOD(isolate, module, "memfdCreate", MemFdCreate);
  SET_METHOD(isolate, module, "copy", Copy);
  SET_METHOD(isolate, module, "alloc", Alloc);

  SET_VALUE(isolate, module, "MFD_CLOEXEC", Integer::New(isolate, MFD_CLOEXEC));

  SET_MODULE(isolate, target, "memory", module);
}
