---
name: Local Android SDK quota
description: Storage constraints encountered while trying to build this Expo app's Android APK locally.
---

The Google Android CLI downloaded the requested packages, but NDK extraction stopped with a disk-quota error while `df` still showed free blocks. Staging the roughly 2 GB NDK under `/dev/shm` bypassed that quota, but `/dev/shm` is mounted `noexec`, so its clang binary cannot run; the NDK also consumes cgroup memory while stored there.

**Why:** Visible filesystem capacity does not reveal the workspace's effective write quota, and tmpfs uses memory and may forbid executable files. A prior Gradle run was killed by the cgroup memory limit while the NDK remained in tmpfs.

**How to apply:** Keep the NDK out of tmpfs during builds. If a matching NDK archive or extraction is available, materialize one executable copy in `/nix/store`, point the SDK's version path there, verify clang executes, then remove the tmpfs extraction. Limit Gradle memory and workers to fit the remaining cgroup budget.
