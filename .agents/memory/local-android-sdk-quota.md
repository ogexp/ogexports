---
name: Local Android SDK build storage
description: Replit storage constraints that can interrupt local Android release builds.
---

The Google Android CLI downloaded the requested packages, but NDK extraction stopped with a disk-quota error while `df` still showed free blocks. Staging the roughly 2 GB NDK under `/dev/shm` bypassed that quota, but `/dev/shm` is mounted `noexec`, so its clang binary cannot run; the NDK also consumes cgroup memory while stored there. Separately, the writable home overlay and `/mnt/scratch` share a 4 GB limit. A Gradle cache near 4 GB can let native compilation finish but make `packageReleaseBundle` fail with `No space left on device`, even when the workspace volume has ample space.

**Why:** Visible filesystem capacity does not reveal the workspace's effective write quota, and tmpfs uses memory and may forbid executable files. A prior Gradle run was killed by the cgroup memory limit while the NDK remained in tmpfs; another release build exhausted scratch while packaging after compiling native code.

**How to apply:** Keep the NDK out of tmpfs during builds. If a matching NDK archive or extraction is available, materialize one executable copy in `/nix/store`, point the SDK's version path there, and verify clang executes. Keep `GRADLE_USER_HOME` and Java's `java.io.tmpdir` under the workspace's ignored `generated-artifacts/` directory, rather than the 4 GB home overlay; limit Gradle memory and workers to fit the cgroup budget.
