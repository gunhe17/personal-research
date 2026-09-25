# Use Poolside in Neovim with CodeCompanion

> Configure Neovim with CodeCompanion to use Poolside through Agent Client Protocol.

## Prerequisites

* You use the `codecompanion.nvim` plugin.
* You have Poolside Agent CLI installed and authenticated. See [Install Poolside Agent CLI](/cli/install).

## Steps

1. Configure Poolside as an ACP-backed adapter in your CodeCompanion configuration.

   ```lua theme={null}
   {
       "olimorris/codecompanion.nvim",
       dependencies = {
           "nvim-lua/plenary.nvim",
           "nvim-treesitter/nvim-treesitter",
       },
       opts = {
           strategies = {
               chat = { adapter = "poolside" },
               inline = { adapter = "poolside" },
           },
           adapters = {
               poolside = function()
                   return {
                       name = "poolside",
                       formatted_name = "Poolside",
                       type = "acp",
                       commands = {
                           default = { "pool", "acp" },
                       },
                   }
               end,
           },
       },
   }
   ```

2. Restart Neovim or reload your CodeCompanion configuration.

3. Select the `poolside` adapter in CodeCompanion.

## Related resources

* [Editors](/tools#editors)
* [Use Poolside in another ACP-compatible editor](/tools/other-acp)
* [CodeCompanion ACP adapter documentation](https://codecompanion.olimorris.dev/configuration/adapters-acp)
