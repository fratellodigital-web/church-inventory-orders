export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_config: {
        Row: {
          id: number
          password: string
          updated_at: string
        }
        Insert: {
          id?: number
          password: string
          updated_at?: string
        }
        Update: {
          id?: number
          password?: string
          updated_at?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      documentos_saida: {
        Row: {
          created_at: string
          drive_file_id: string | null
          id: string
          numero: string
          pdf_url: string | null
          pedido_id: string
        }
        Insert: {
          created_at?: string
          drive_file_id?: string | null
          id?: string
          numero?: string
          pdf_url?: string | null
          pedido_id: string
        }
        Update: {
          created_at?: string
          drive_file_id?: string | null
          id?: string
          numero?: string
          pdf_url?: string | null
          pedido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_saida_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      igrejas: {
        Row: {
          ativo: boolean
          cidade: string | null
          created_at: string
          id: string
          nome: string
          regiao: string | null
          responsavel: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          created_at?: string
          id?: string
          nome: string
          regiao?: string | null
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          created_at?: string
          id?: string
          nome?: string
          regiao?: string | null
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string
          id: string
          observacao: string | null
          pedido_id: string | null
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
        }
        Insert: {
          created_at?: string
          id?: string
          observacao?: string | null
          pedido_id?: string | null
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
        }
        Update: {
          created_at?: string
          id?: string
          observacao?: string | null
          pedido_id?: string | null
          produto_id?: string
          quantidade?: number
          tipo?: Database["public"]["Enums"]["movimentacao_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          created_at: string
          id: string
          pedido_id: string
          produto_id: string
          quantidade: number
          snapshot_nome: string
          snapshot_unidade: string
        }
        Insert: {
          created_at?: string
          id?: string
          pedido_id: string
          produto_id: string
          quantidade: number
          snapshot_nome: string
          snapshot_unidade: string
        }
        Update: {
          created_at?: string
          id?: string
          pedido_id?: string
          produto_id?: string
          quantidade?: number
          snapshot_nome?: string
          snapshot_unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cancelado_em: string | null
          comprovante_drive_file_id: string | null
          comprovante_numero: string | null
          comprovante_url: string | null
          created_at: string
          entregue_em: string | null
          id: string
          igreja_id: string
          numero: string
          observacao: string | null
          pago_em: string | null
          solicitante_nome: string | null
          status: Database["public"]["Enums"]["pedido_status"]
          updated_at: string
        }
        Insert: {
          cancelado_em?: string | null
          comprovante_drive_file_id?: string | null
          comprovante_numero?: string | null
          comprovante_url?: string | null
          created_at?: string
          entregue_em?: string | null
          id?: string
          igreja_id: string
          numero?: string
          observacao?: string | null
          pago_em?: string | null
          solicitante_nome?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          updated_at?: string
        }
        Update: {
          cancelado_em?: string | null
          comprovante_drive_file_id?: string | null
          comprovante_numero?: string | null
          comprovante_url?: string | null
          created_at?: string
          entregue_em?: string | null
          id?: string
          igreja_id?: string
          numero?: string
          observacao?: string | null
          pago_em?: string | null
          solicitante_nome?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_igreja_id_fkey"
            columns: ["igreja_id"]
            isOneToOne: false
            referencedRelation: "igrejas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          codigo: string | null
          created_at: string
          descricao: string | null
          estoque_disponivel: number
          estoque_fisico: number
          estoque_minimo: number
          foto_url: string | null
          id: string
          nome: string
          preco: number
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          estoque_disponivel?: number
          estoque_fisico?: number
          estoque_minimo?: number
          foto_url?: string | null
          id?: string
          nome: string
          preco?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          estoque_disponivel?: number
          estoque_fisico?: number
          estoque_minimo?: number
          foto_url?: string | null
          id?: string
          nome?: string
          preco?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      movimentacao_tipo:
        | "entrada"
        | "saida"
        | "reserva"
        | "estorno_reserva"
        | "ajuste"
      pedido_status:
        | "pendente"
        | "pago"
        | "em_separacao"
        | "entregue"
        | "cancelado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      movimentacao_tipo: [
        "entrada",
        "saida",
        "reserva",
        "estorno_reserva",
        "ajuste",
      ],
      pedido_status: [
        "pendente",
        "pago",
        "em_separacao",
        "entregue",
        "cancelado",
      ],
    },
  },
} as const
