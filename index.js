const template = require(`@babel/template`).default;

const FUNCTION_NODES = new Set([
    `FunctionDeclaration`,
]);

const DYNAMIC_IMPORT = template(`const REFERENCE_NAME = (await import(IMPORT_SOURCE)).IMPORT_SPECIFIER`, {
    allowAwaitOutsideFunction: true,
    plugins: [`dynamicImport`],
});

module.exports = function ({types: t}) {
    function findAsyncPath(path) {
        if (path === null)
            return null;

        const scopePath = path.scope.path;

        if (FUNCTION_NODES.has(scopePath.node.type) && scopePath.node.async)
            return scopePath;

        return findAsyncPath(scopePath.parentPath);
    }

    return {
        visitor: {
            ImportDeclaration: {
                enter(path, state) {
                    const actions = [];

                    for (const specifier of path.get(`specifiers`)) {
                        const importedIdentifierName = specifier.node.local.name;
                        const {referencePaths} = path.scope.getBinding(importedIdentifierName);

                        const referencesWithTheirBlocks = referencePaths.map(referencePath => {
                            return [referencePath, findAsyncPath(referencePath)];
                        });

                        // If even one of the references is used in a strictly
                        // synchronous block, there's no point in lazy-loading
                        // the file
                        if (referencesWithTheirBlocks.some(([, asyncPath]) => asyncPath === null))
                            return;

                        for (const [referencePath, asyncPath] of referencesWithTheirBlocks) {
                            actions.push([specifier, referencePath, asyncPath]);
                        }
                    }

                    if (actions.length === 0)
                        return;

                    for (const [specifierPath, referencePath, asyncPath] of actions) {
                        asyncPath.get(`body`).unshiftContainer(`body`, DYNAMIC_IMPORT({
                            REFERENCE_NAME: referencePath.node,
                            IMPORT_SOURCE: path.node.source,
                            IMPORT_SPECIFIER: specifierPath.node.imported || t.identifier(`default`),
                        }));
                    }

                    path.remove();
                },
            },
        },
    };
};
