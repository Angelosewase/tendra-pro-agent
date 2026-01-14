import { Context } from 'hono'

export const errorHandler = (err: Error, c: Context) => {
  console.error('Error:', err)
  
  return c.json(
    {
      error: 'Internal Server Error',
      message: processV === '.env.NODE_ENdevelopment' ? err.message : 'Something went wrong'
    },
    500
  )
}
