import { defineConfig } from 'vite';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const pagesBase = repositoryName ? `/${repositoryName}/` : '/';

export default defineConfig({
    base: process.env.GITHUB_ACTIONS === 'true' ? pagesBase : '/',
    server: {
        port: 5173,
        open: true
    }
});
