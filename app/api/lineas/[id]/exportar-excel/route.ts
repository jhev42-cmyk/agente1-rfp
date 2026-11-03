import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    // Generar CSV de ejemplo con estructura correcta
    const rows = [
      'Familia,Descripción técnica,Cantidad,Precio Unitario,Costo Total',
      '"Familia 1","Material 1",10,1000,10000',
      '"Familia 1","Material 2",5,2000,10000',
      ',"Subtotal Familia 1",,,"20000"',
      '"Familia 2","Material 3",8,1500,12000',
      ',"Subtotal Familia 2",,,"12000"',
      ',"COSTO TOTAL DEL PROYECTO","",,32000',
    ]

    const csv = rows.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Cotizacion_${id}.csv"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
