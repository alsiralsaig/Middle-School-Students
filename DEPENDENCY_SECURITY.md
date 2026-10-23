# Dependency security note

The root `package.json` pins `deepmerge-ts` to `8.0.2` through npm overrides. This addresses the high-severity advisory [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), which affects versions below 8.0.0. Prisma 6.19.3's `@prisma/config` dependency pins 7.1.5; its config loader imports only the named `deepmerge` function. The override was checked with the installed Prisma config loader, `prisma validate`, and the workspace builds. Prisma and `@prisma/client` remain at 6.19.3; this does not apply a database migration or alter database data.

Re-check with:

```bash
npm audit
npm ls deepmerge-ts @prisma/config --all
```
